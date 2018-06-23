import View from 'ol/view'
import Overlay from 'ol/overlay'
import Control from 'ol/control'
import coordinate from 'ol/coordinate'
import proj from 'ol/proj';
import olMap from 'ol/map'
import TileGrid from 'ol/tilegrid/tilegrid'
import ScaleLine from 'ol/control/scaleline'
import Tile from 'ol/layer/tile'
import interaction from 'ol/interaction'
import Select from 'ol/interaction/select'
import MousePosition from 'ol/control/mouseposition'
import TileImage from 'ol/source/tileimage'
import Feature from 'ol/feature'
import Point from 'ol/geom/point'
import ContextMenu from 'ol-contextmenu'
import WKT from 'ol/format/wkt'
import Vector from 'ol/layer/vector'
import SourceVector from 'ol/source/vector'
import Draw from 'ol/interaction/draw'
import Style from 'ol/style/style'
import Fill from 'ol/style/fill'
import Stroke from 'ol/style/stroke'
import Icon from 'ol/style/icon'
import Text from 'ol/style/text'
import { message } from 'antd'
import { api } from '../../../../../utils/api'
import request from '../../../../../utils/request'
import {toHex} from '../../../../../utils/commonTools'

//let projectionLS = new BMap.MercatorProjection();
//let pointLs = projectionLS.lngLatToPoint(new BMap.Point(120.3168, 30.2447));
export let olmap = {} //存储地图对象
//视图对象
let localStorageCenter = localStorage.getItem('center');
let viewCenter = localStorageCenter?
                JSON.parse(unescape(localStorageCenter))
                :
                [13393750.64, 3513323.27]

export let view = new View({//中心点
        center: viewCenter,
        zoom: 13,
        minZoom: 2,  
    })

//弹出框对象
export let popup = new Overlay(//POPUP弹出框
    {
        //element: "element", 
        closeBox: true,
        // positioning: 'auto',
        autoPan: true,
        autoPanAnimation: { duration: 250 }
    });


//右键事件
const contextmenuItems = [
    {
        text: '设为中心',
        classname: 'bold',
        icon: require('../../images/center.png'),
        callback: center
    },
    {
        text: '添加诱导屏',
        icon: require('../../images/pin_drop.png'),
        callback: addGuideScreen
    }
];
function center(obj) {
    let center = obj.coordinate
    view.animate({
        duration: 700,
        easing: elastic,
        center: center
    });
    localStorage.setItem('center', escape(JSON.stringify(center)));
}
function elastic(t) {//运动函数
    return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1;
}


//初始化地图对象
const initLocalMap = (data) => {
    let tilesources = []; //存储各类地图
    let projection = proj.get("EPSG:3857");  //地图切片使用的坐标系

    /**
     * resolutions:平铺层级 1~2^18
     */
    let resolutions = [];
    for (let i = 0; i < 19; i++) {
        resolutions[i] = Math.pow(2, 18 - i);
    }
    let tilegrid = new TileGrid({
        origin: [0, 0],
        resolutions: resolutions
    });

    let baidu_source1 = new TileImage({//调用本地的百度地图
        projection: projection,
        tileGrid: tilegrid,
        tileUrlFunction: function (tileCoord) {//tileCoord 含三个参数：缩放级别z、切片的x y索引
            if (!tileCoord) {
                return "";
            }
            ////0 z 1 x 2 y
            let curx = Math.pow(2, tileCoord[0] - 1) + tileCoord[1];
            let cury = Math.pow(2, tileCoord[0] - 1) - 1 - tileCoord[2];
            let z = tileCoord[0] > 10 ? tileCoord[0] : "0" + tileCoord[0];
            let x = toHex(curx);
            let y = toHex(cury);
            return "http://" + data.ip + "/maptiles/baidu2d/L" + z + "/R" + y + "/C" + x + ".png";
        },
        maxZoom: 19
    });

    tilesources.push(
        {
            name: "百度地图",
            source: baidu_source1
        }
    );

    let baidu_source = tilesources[0].source;//百度地图
    let baidu_layer = new Tile({
        source: baidu_source
    });

    let mousePositionControl = new MousePosition({//鼠标移入显示坐标的
        target: document.getElementById('mouse-position'),
        coordinateFormat: coordinate.createStringXY(4),//保留四位小数
        projection: 'EPSG:4326',
        undefinedHTML:'&nbsp'
    });
    // console.log('mousePosition',mousePositionControl.getProjection())

    //比例尺对象
    let scaleline = new ScaleLine({
    	units:"metric",                      //设置比例尺单位，有degrees、imperial、us、nautical或metric  
        target: document.getElementById('scale-line') //显示比例尺的目标容器  
    })
    //init 地图
    olmap = new olMap({
        target: 'map',
        layers: [baidu_layer],
        view: view,
        controls: Control.defaults({
            attributionOptions: ({
                collapsible: false
            })
        }).extend([mousePositionControl,scaleline]),
        // overlays: [popup],
        interactions: interaction.defaults({ doubleClickZoom: false })
    });

    //鼠标移入地图事件///////////////////////////////////
    olmap.on("pointermove", function (evt) {
        // console.log('鼠标移入事件',evt)
    })
}

//初始化右键菜单事件
const initContentMenu = () => {
    let contextmenu = new ContextMenu({
        width: 180,
        defaultItems: false,
        items: contextmenuItems
    });
    // console.log('contextmenu',contextmenu)
    olmap.addControl(contextmenu)
}

//添加诱导屏
function addGuideScreen(obj) {
        let iconStyle = new Style({
            image: new Icon({ scale: .6, src: '../../images/pin.png' }),
        }),
        feature = new Feature({
            type: 'removable',
            geometry: new Point(obj.coordinate)
        });
        feature.setStyle(iconStyle);
        console.log(feature)
    // const { dispatch } = that.props;
    // YouDaoFeature = addYouDaoMarker(obj)
    // dispatch(fetchGetYoudaoListIfNeed())
    // that.setState({
    //     addYouDao: 1,
    //     youdaopingData: []
    // })
}
const initGuideScreen = () => {
    let selectEventOne = new Select();
    olmap.addInteraction(selectEventOne);
    let selectFeature = null;
    let imaNum = 0;
    selectEventOne.getFeatures().on(['add'], function (e) {//获取选中内容
        console.log('getFeaturesadd',e)
    })
    selectEventOne.getFeatures().on(['remove'], function (e) {
        console.log(e)
        // popup.hide();
        // const { dispatch } = that.props;
        // dispatch(popupAlert("0"))
        // that.setState({
        //     roadpopupflag: false,
        // })
    })
}

export let constroadlayer = {};
let layerPopMarker = null;
//将路网图层加载进入地图组件中
const Addroadlayer = (func) => {
    request(api.queryAllWays,{}).then(res => {
        if(res.code===200) {
            console.log(res.data)
            const data = res.data;
            let features = [];
            let wktformat = new WKT();
            for (let i = 0; i < data.length; i++) {
                let _feature = wktformat.readFeature(
                    data[i].theGeom, {
                        dataProjection: 'EPSG:4326',
                        featureProjection: 'EPSG:3857'
                    });
                if(data[i].type===2) {
                    _feature.setProperties({ "gid": data[i].gid });
                    _feature.setProperties({ "name": data[i].name });
                    _feature.setProperties({ "source": data[i].source });
                    _feature.setProperties({ "target": data[i].target });
                    _feature.setProperties({ "type": data[i].type });
                    _feature.setProperties({ "LineString": "keyway" });
                    // let Gid = data[i].gid;
                    // _feature = _this.keywayqueryall(feature, Gid)
                }else {
                    ///赋予属性值，为了后续能够使用
                    _feature.setProperties({ "gid": data[i].gid });
                    _feature.setProperties({ "name": data[i].name });
                    _feature.setProperties({ "source": data[i].source });
                    _feature.setProperties({ "target": data[i].target });
                    _feature.setProperties({ "type": data[i].type });
                    _feature.setProperties({ "LineString": "noraml" });
                }
                features.push(_feature);
            }
            if (JSON.stringify(constroadlayer) !== "{}") {
                olmap.removeLayer(constroadlayer);
            }
            var roadlayer = new Vector({
                id: "roadlayer",
                source: new SourceVector({
                    features: features
                }),
                style:styleFunction
            });
            constroadlayer = roadlayer;
            constroadlayer.setVisible(false) //初始化不显示路网层
            olmap.addLayer(constroadlayer);
            if(typeof func==='function') func(constroadlayer);
        }else{console.log('error',res.message)}
    })
}
//将诱导屏图层加载进入地图组件中
const AddGuideScreen = (fun) => {
    request(api.queryGuideScreenInfo,{}).then(res => {
        if(res.code===200){
            console.log(res)
            let data = res.data
            let wktformat = new WKT();
            let features = [];
            for (let i = 0; i < data.length; i++) {
                let wktData = wktformat.readFeature(
                    data[i].theGeom, {
                        dataProjection: 'EPSG:4326',
                        featureProjection: 'EPSG:3857'
                    }); 
                let coord3857 = wktData.getGeometry().flatCoordinates,
                    iconStyle = new Style({
                        image: new Icon({ scale:.6, src:require('../../images/pin.png')}),
                        text: new Text({
                            offsetY: 25,
                            font: '15px Open Sans,sans-serif',
                            fill: new Fill({ color: '#999999' }),
                            stroke: new Stroke({ color: '#eee', width: 4 })
                        })
                    }), feature = new Feature({
                        type: 'removable',
                        id: data[i].id,
                        geometry: new Point(coord3857)
                    });
                // console.log("coord4326",new Point(coord4326))
                feature.setProperties({ "id":data[i].id });
                feature.setProperties({ "devCode":data[i].devCode });
                feature.setProperties({ "devName":data[i].devName });
                feature.setProperties({ "devStreet":data[i].devStreet });
                feature.setProperties({ "devDesc":data[i].devDesc });
                feature.setProperties({ "gidList":data[i].gidList });
                feature.setProperties({ "spec":data[i].spec });
                feature.setStyle(iconStyle);
                features.push(feature)
                let roadlayer = new Vector({
                    id: 'layername',
                    source: new SourceVector({
                        features: features
                    })
                });
                layerPopMarker = roadlayer;
                olmap.addLayer(layerPopMarker);
                if(typeof(fun)==='function') fun(layerPopMarker)

            }
        }
    })
}

export const initMap = () => {
    request(api.queryMapServer,{}).then(res => {
        // console.log(res)
        if(res.code===200) {
            let data = res.data
            initLocalMap(data) //加载地图
            initContentMenu()  //加载右键事件
            initGuideScreen()  //加载诱导屏
            Addroadlayer()     //加载路网
            AddGuideScreen()   //加载诱导屏
        }else{message.warn(res.message,1)}
    })
}

//定义线色
const styleFunction = (() => {
  let styles = {};
  styles['MultiLineString'] = new Style({
    stroke: new Stroke({
      color: 'rgba(68,159,207, 1)',
      width: 3
    })
  });
  styles['default'] = new Style({
    stroke: new Stroke({
      color: 'rgba(68,159,207, .8)',
      width: 3
    }),
    fill: new Fill({
      color: 'rgba(255, 0, 0, 0.1)'
    }),
  });
  return function(feature) {
    return styles[feature.getGeometry().getType()] || styles['default'];
  };
})();

//划线函数
export let roadLine = {}
export const drawLine = (drawend) => {
    roadLine = new Draw({
            type: "MultiLineString",
            source: constroadlayer.getSource()
        });
    console.log(roadLine)
    roadLine.on(['drawend'], (evt) => {
        let currentFeature = evt.feature,
            geo = currentFeature.getGeometry(),
            coordinate = geo.getCoordinates()[0],
            coordinateLen = coordinate.length;
        let arr_Line = []
        for (let i = 0; i < coordinateLen; i++) {
            console.log('proj',proj)
            let item = proj.transform(coordinate[i], 'EPSG:3857', 'EPSG:4326')
            arr_Line.push(item.join(" "))
        }
        let LineStringArr = arr_Line.join(",")
        LineStringArr = "LINESTRING(" + LineStringArr + ")"
        if(typeof(drawend)==='function') drawend(LineStringArr);
    })
    olmap.addInteraction(roadLine)
}

/////添加中心点图标////////////////
// let stroke = new ol.style.Stroke({ color: "blue", width: 2 });
// let styleCenter = [new ol.style.Style({ image: new ol.style.RegularShape({ points: 4, radius: 11, radius1: 0, radius2: 0, snapToPixel: true, stroke: new ol.style.Stroke({ color: "#fff", width: 3 }) }) }),
// new ol.style.Style({ image: new ol.style.RegularShape({ points: 4, radius: 11, radius1: 0, radius2: 0, snapToPixel: true, stroke: stroke }) })
// ];

// let target = new ol.control.Target({ style: styleCenter, composite: "" });
// map.addControl(target);
