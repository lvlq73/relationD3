// require('../css-module/relsMap-tooltip.less');
//const d3 = require('d3');
const $ = jQuery;

const markerId = "resolved";
const markerOverId = "resolved_over";
let clickFlagMap = {};
let simulation,node,link,linetext,svg,stage_g,currentItem,width,height;
let nodeMap={};

//默认配置
const option = {
  dom: document.getElementsByTagName('body'),
  color: '',
  alias: {
    root: "root",
    nodeText: "name",
    nodeImg: "img",
    lineText: "relation"
  },
  nodes: [],
  links: [],
  icons: [],
  zoom: true,
  zoomRange:[1,5],
  alpha:1,//衰减系数，[0,1]之间,越小迭代次数越多，0时迭代不会停止。
  lineStyle: {
    stroke: '#8d8a8e',
    strokeWidth: 1,
    strokeOver: '#85bffe', //选中样式
    strokeWidthOver: 2 //选中样式
  },
  lineTextStyle: {
    fontSize: 12
  },
  lineTextEvent: {
    click: function(e,d) {

    }
  },
  nodeEvent: {
    click: function(e,d) {

    }
  }
}



function extend(o, n, override) {
  for (let p in n) {
    if (n.hasOwnProperty(p) && (!o.hasOwnProperty(p) || override))
      o[p] = n[p];
  }
}

//拉拽事件
const drag = simulation => {
  function dragstarted(event) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;

    if(event.subject[option.alias.root || "root"]) {
      $.each(nodeMap, function(key, val) {
        delete val.fx;
        delete val.fy;

      })
      simulation.alpha(1).restart();
    }
  }

  function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;


  }

  function dragended(event) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = event.x;
    event.subject.fy = event.y;

    if(!event.subject[option.alias.root || "root"]) {
      nodeMap[event.subject.id] = event.subject;
    }
  }

  return d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}

const color = (d, i) => {
  const scale = d3.schemeCategory10;
  return scale[i];
}

//构建defs组件
function defs(stage_g) {
  let defs = stage_g.append("svg:defs")
  defs.append("marker")
    .attr("id", markerId)
    .attr("markerUnits","userSpaceOnUse")
    .attr("viewBox", "0 -5 10 10")//坐标系的区域
    .attr("refX", 35)//箭头坐标
    .attr("refY", 0)
    .attr("markerWidth", 12)//标识的大小
    .attr("markerHeight", 12)
    .attr("orient", "auto")//绘制方向，可设定为：auto（自动确认方向）和 角度值
    .attr("stroke-width", 3)//箭头宽度
    .append("path")
    //.attr("d", "M0,-3L10,0L0,3L3,0")//箭头的路径
    .attr('d', 'M0,-4L10,0L0,4')
    //.attr('fill','#85bffe');//箭头颜色
    .attr('fill', option.lineStyle.stroke);

  defs.append("marker")
    .attr("id", markerOverId)
    .attr("markerUnits","userSpaceOnUse")
    .attr("viewBox", "0 -5 10 10")//坐标系的区域
    .attr("refX", 35)//箭头坐标
    .attr("refY", 0)
    .attr("markerWidth", 12)//标识的大小
    .attr("markerHeight", 12)
    .attr("orient", "auto")//绘制方向，可设定为：auto（自动确认方向）和 角度值
    .attr("stroke-width", 3)//箭头宽度
    .append("path")
    //.attr("d", "M0,-3L10,0L0,3L3,0")//箭头的路径
    .attr('d', 'M0,-4L10,0L0,4')
    .attr('fill', option.lineStyle.strokeOver);//箭头颜色

  defs.append("rect")
    .attr("id", "rect")
    .attr("x", "-15px")
    .attr("y", "-15px")
    .attr("height", (30 * 2)+ "px")
    .attr("width", (30 * 2) + "px")
    .attr("rx", "30px")

  defs.append("clipPath")
    .attr("id", "clip")
    .append("use")
    .attr("xlink:href", "#rect")

  var filter = defs.append('svg:filter')
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 1)
    .attr("height", 1)
    .attr("id", "solid")

  filter.append("svg:feFlood")
    .attr("flood-color", "white")

  filter.append("svg:feComposite")
    .attr("in", "SourceGraphic")
}

//构建关系线
function drawLink(stage_g) {
  link = stage_g.append("g")
    //.attr("stroke", "#85bffe")
    .attr("stroke", option.lineStyle.stroke)
    .attr("stroke-opacity", 0.8)
    .selectAll("line")
    .data(option.links)
    .join("line")
    .attr("marker-end", "url(#resolved)")
    .attr("stroke-width", option.lineStyle.strokeWidth);

  linetext = stage_g.append("g")
    .attr("class", "line-text")
    .selectAll("text")
    .data(option.links)
    .enter()
    .append("text")
    .attr("text-anchor", "middle")
    .attr("fill", "rgb(102, 102, 102)")
    .attr("filter", "url(#solid)")
    .attr("font-size", function(d){
      let lineText = d[option.alias.lineText || "relation"]
      return (8 / Math.max(lineText.length, 9)) * option.lineTextStyle.fontSize;
    })
    .text(function(d) {
      return d[option.alias.lineText || "relation"];
    })
    .on("click", option.lineTextEvent.click);
}

//构建node节点
function drawNode(stage_g) {
  node = stage_g.append("g")
    .selectAll("g")
    .data(option.nodes,d=>d.id)
    .join("g")
    .classed('force-node',true)
    .call(drag(simulation))

  let nodeG = node.append("g")
    .attr("class", 'nodeG')
    .on('click', (e,d)=> {
      if (currentItem && currentItem.id != d.id) {
        clickFlagMap[currentItem.id] = false;
      }

      clickFlagMap[d.id] = !clickFlagMap[d.id]
      currentItem = d;
      node.selectAll('circle').classed('selected', item=> item == d && clickFlagMap[d.id]);
      option.nodeEvent.click(e,d);
    }).on("mouseover", function(e, item) {
      if(option.nodeEvent.mouseover && typeof(option.nodeEvent.mouseover) == "function"){
        option.nodeEvent.mouseover(e, item, this);
        return;
      }
      // 边样式设置
      link.style("stroke-width",function(line, i){
        if(line.source.id==item.id || line.target.id==item.id){
          return option.lineStyle.strokeWidthOver;
        }else{
          return option.lineStyle.strokeWidth;
        }
      });

      link.style("stroke",function(line, i){

        if(line.source.id==item.id || line.target.id==item.id){
          return option.lineStyle.strokeOver;
        }else{
          return option.lineStyle.stroke;
        };

      })

      link.attr("marker-end", function (line){
        if(line.source.id==item.id || line.target.id==item.id){
          return "url(#"+ markerOverId +")";
        } else {
          return "url(#"+ markerId +")";
        }

        return "";
      });
      node.selectAll('circle').classed('selected', obj => obj == item);
    })
    .on("mouseout", function(e, item) {
      if(option.nodeEvent.mouseout && typeof(option.nodeEvent.mouseout) == "function"){
        option.nodeEvent.mouseout(e, item, this);
        return;
      }
      // 边样式设置
      link.style("stroke-width",function(line){
        return option.lineStyle.strokeWidth;
      });
      if (currentItem && clickFlagMap[currentItem.id]){
        if (currentItem){
          link.style("stroke",function(line, i){
            if(line.source.id==currentItem.id || line.target.id==currentItem.id){
              return option.lineStyle.strokeOver;
            }else{
              return option.lineStyle.stroke;
            }
          });

          link.attr("marker-end", function (line){
            if((line.source.id==currentItem.id || line.target.id==currentItem.id)){
              return "url(#"+ markerOverId +")";
            } else {
              return "url(#"+ markerId +")";
            }
          });
        }
      }else{
        link.style("stroke",function(line, i){
          return option.lineStyle.stroke;
        });

        link.attr("marker-end", function (line){
          return "url(#"+ markerId +")";
        });
      }
      node.selectAll('circle').classed('selected', obj => {
        if (obj) {
          return clickFlagMap[obj.id] || false
        }
        return false;
      });
    })
    .on("mousedown", function(e, item) {
      // currentItem = item;
      if(option.nodeEvent.mousedown && typeof(option.nodeEvent.mousedown) == "function"){
        option.nodeEvent.mousedown(this, e, item);
      }
    });


  nodeG.append('circle')
    .attr('class', 'circle')
    .attr('r', 30)
    .attr('cx', 15)
    .attr('cy', 15)
    .attr('fill','#ffffff')

  nodeG.append("svg:image")
    .attr("class", "node-icon")
    .attr("xlink:href", function (d) {
      return d[option.alias.nodeImg || "img"]; // 修改节点头像
    })
    .attr("src", function (d) {
      return d[option.alias.nodeImg || "img"]; // 修改节点头像
    })
    .attr("x", "-15px")
    .attr("y", "-15px")
    .attr("height", 30 * 2)
    .attr("width", 30 * 2)
    .attr("clip-path", "url(#clip)")

  nodeG.append('text')
    .text(d=> d[option.alias.nodeText || "name"])
    .classed('node-text',true)
    .attr("x", 15)
    .attr("y", 15)
    .attr('style', d=>{
      let trans = 0;
      return `transform: translate(${trans}px, 50px);text-anchor: middle;font-size: 12px;`
    });


  nodeG.append("title")
    .text(d => d[option.alias.nodeText || "name"]);
}

//构建图谱
function drawForce(userOption) {
  extend(option,userOption,true);

  const dom = option.dom;
  //禁止右击事件
  dom.oncontextmenu = function() {return false;};
  height = dom.offsetHeight;
  width = dom.offsetWidth;

  //初始化zoom事件
  const zoom = d3.zoom()
    .scaleExtent(option.zoomRange)
    .on("zoom", function (event) {
      const {transform} = event;
      stage_g.attr('transform',`translate(${transform.x},${transform.y}),scale(${transform.k})`)
    });

  simulation = d3.forceSimulation(option.nodes)
    .force("link", d3.forceLink(option.links).distance(200).id(function(d) {
      return d.id;
    }))
    // .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide(30)) // 半径碰撞相互作用力
    .force("manyBody", d3.forceManyBody().strength(-500));

  simulation.on("tick", () => {

    // 关系值
    linetext.attr("dx", function(d) {
      return(d.source.x + d.target.x) / 2;
    })
      .attr("dy", function(d) {
        return(d.source.y + d.target.y) / 2 + 4.5;
      })
      .attr("transform", function(d) {
        if(!d.target.x && !d.source.x){
          return;
        }
        var xTemp = d.target.x - d.source.x;
        var yTemp = d.target.y - d.source.y;
        var otherFlag = 0;
        if(xTemp < 0) {
          otherFlag = 360;
        }
//			if(xTemp > 0){
        if (xTemp == 0) xTemp = 0.01;
        if (yTemp == 0) yTemp = 0.01;
        return "rotate(" + parseFloat((Math.atan(yTemp / xTemp) * 180 / Math.PI) - otherFlag) +
          " " + parseFloat(d.source.x + d.target.x) / 2 + "," + parseFloat(d.source.y + d.target.y) / 2 + ")";
//			}

      });

    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    node.attr("transform", d => `translate(${d.x-15},${d.y-15})`);

  });

  svg = d3.select(`#${option.dom.id}`).append('svg')
    .attr('id','d3ForceEasyStage')
    .attr("viewBox", [0, 0, width, height])
    .call(zoom);

  stage_g = svg.append('g').classed('stage-g',true);

  defs(stage_g);

  drawLink(stage_g);

  drawNode(stage_g);


  setTimeout(function (){
    simulation.force("center", null);
  },50);
  return simulation;
}

/*function addNodes(sourceId,newNodes){
  let sourceIndex = 0;
  let diff = {};
  let action = false;
  option.nodes.forEach((d,i)=>{
    diff[d.name] = 'index'+ i;
    if(d.id == sourceId)
      sourceIndex = i
  })
  newNodes.forEach(d=>{
    if(!diff[d.name]){
      option.nodes.push(d);
      option.links.push({source:sourceIndex,target:option.nodes.length-1})
      action = true;
    }else{
      let newlink = {source:sourceIndex,target:diff[d.name].split('index')[1]*1};

      if(option.links.find(d=>{
        return JSON.stringify(d.source.index+','+d.target.index) === JSON.stringify(newlink.source+','+newlink.target)
      })
      ){
        //is same link
      }else{
        option.links.push(newlink)
        action = true
      }

    }
  })

  if(!action){
    console.log('no new force')
    return
  }



  link = link.data(option.links).enter()
    .append("line")
    .attr("stroke", "#999")
    .attr("stroke-opacity", 0.6)
    .attr("stroke-width", 1)
    .attr("marker-end", "url(#resolved)")
    .merge(link);

  node = node.data(option.nodes,d=>d.id).enter()
    .append("g")
    .classed('force-node',true)
    .merge(node)
    .on('click',(e,d)=>{
      currentItem = d;

      node.selectAll('circle').classed('selected',item=>item == d)
    })
    .call(drag(simulation))

  node.selectAll('rect').remove();
  node.selectAll('path').remove();
  node.selectAll('text').remove();

  node.append('circle')
    .attr('r', 20)
    .attr('cx', 15)
    .attr('cy', 15)
    .attr('fill','#ffffff')

  node.append('path')
    .attr("d", d => {
      if(option.icons.length){
        return option.icons.find(item => {
          return item.type == d.type
        }).icon;
      }else{
        return defaultIcon
      }
    })
    .classed('icon-path',true)
    .attr("fill", option.color||color)
    .attr('transform','scale(0.03)')

  node.append('text')
    .text(d=>d.name)
    .classed('node-text',true)
    .classed('hide',!option.text.show)
    .attr('style', d=>{
      let trans = d.name.length*3;
      return `transform: translate(-${trans}px, 42px);`
    });




  simulation.nodes(option.nodes)
  simulation.force("link", d3.forceLink(option.links).distance(200)).force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(width / 2, height / 2));
  simulation.restart();

}*/

function addNodes(newLink,newNode) {
  option.nodes.push(newNode);
  option.links.push(newLink);
  reset();
}

function removeNode(data){
  let item = data || currentItem;
  let index = option.nodes.findIndex(d=>d.id==item.id)
  option.nodes.splice(index,1);

  for(let i = option.links.length-1;i>=0;i--){
    if((option.links[i].source.id == item.id) ||(option.links[i].target.id == item.id)){
      option.links.splice(i,1)
    }
  }
  reset(option.nodes, option.links);
}

function reset(nodes, links) {
  option.dom.innerHTML = null;
  if (nodes) {
    option.nodes = nodes;
  }
  if (links) {
    option.links = links;
  }
  drawForce(option);
}



