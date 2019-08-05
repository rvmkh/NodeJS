"use strict";

const express = require("express");
const app = express();
const hbs = require("hbs");
const fs = require("fs");
const bodyParser = require("body-parser");

let voiceData = ""
let evdoData = ""
let reqArr = [];
let renderArr = [];
let renderVArr = [];
let reqVoice = "";
let strColor = "";
let renderObj;
// let rssiJson = "";
let bts = "";
let rssiData = [];

// read snoop from ap/flx and refresh a pages AP/FLX each 2 sec (see <meta...> at ap/flx.hbs)
setInterval(readData, 2000);
// setInterval(eraseData, 60000); // erase input-files to avoid overlapping each 60 sec

hbs.registerPartials(__dirname + "/views/partials");
app.set("view engine", "hbs");

// http LOGs
app.use((req, res, next) => {
   let currentTime = getTime();
   let data = `${currentTime} ${req.method} ${req.url} ${req.get("user-agent")}`;
   fs.appendFile("server.log", data + "\n", "utf8", (error) => {
     if (error) { throw error; }
   });
   next();
});
// Voice Request
app.use("/dhcpRequest/voice", (req, res) => {
  res.render("ap.hbs",
   {test: voiceData}
  );
});
// EVDO Request
app.use("/dhcpRequest/evdo", (req, res) => {
  res.render("flx.hbs",
    {printData: evdoData}
  );
});
// RSSI
app.use(bodyParser.urlencoded({extended: false}));
app.post("/dhcpRequest/rssi", (req, res, next) => {
  bts = req.body.bts;
  readRssi(bts);
  next();
});
app.use("/dhcpRequest/rssi", (req, res) => {
  res.render("rssi.hbs",
  {printData: rssiData})
});
// HOME
app.get("/dhcpRequest", (req, res) => {
   res.render("home.hbs");
   console.log("Access to /menu");
});

// Launch Server
app.listen(3001, 'localhost');
console.log("Server started at localhost:3001");


  //******************* SUBs *******************//
function readData() {

  fs.readFile(__dirname + "/inputRequest/voice.log", "utf8", (error, data) => {
     if (error) {
        throw error;
     }
     reqVoice = data.split(/\n/);                                             // Split whole data to Arr; each cell == one Request
     voiceData = parseVoice(reqVoice);
     // console.log(voiceData);
  });

  fs.readFile(__dirname + "/inputRequest/evdo.log", "utf8", (error, data) => {
     if (error) {
        throw error;
     }
     reqArr = data.split(/\sIP\s/);                                             // Split whole data to Arr; each cell == one Request
     evdoData = parseRequest(reqArr, data);                                     // parse this Arr and return Obj to Render
  });

}

function eraseData() {

  fs.writeFile(__dirname + "/inputRequest/evdo.log", "", (error) => {
    if (error) {
       throw error;
    }
  });
//  fs.writeFile(__dirname + "/inputRequest/voice.log", "", (error) : {	// tmp rem while AP is under construction
//    if (error) {
//       throw error;
//    }
//  });

}

function getRNC(cell, renderObj) {                                                          // grep cnhost by cell from dhcpd*.conf
  const spawn = require('child_process').spawn;
  let grepCell = /cell(\d{1,4})-\d/.exec(cell);
  if ( grepCell ) {
   grepCell = grepCell[1];
   let grepCN = spawn('./grepRnc.sh', [grepCell]);

   grepCN.stdout.on('data', (data) => {
      let rncHash = {
        "172.17.0.37"   :      1,
        "172.17.0.101"  :      2,
        "172.17.0.165"  :      3,
        "172.17.0.229"  :      4,
        "172.17.8.37"   :      7,
        "172.17.8.101"  :      8,
        "172.17.8.165"  :      9,
        "172.17.8.229"  :      10,
        "172.17.2.37"   :      12,
        "172.17.1.36"   :      13,
        "172.17.1.164"  :      14,
        "172.17.2.36"   :      15,
        "172.17.2.164"  :      16,
        "172.17.3.36"   :      17,
        "172.17.3.164"  :      18,
        "172.17.5.36"   :      19,
        "172.17.5.164"  :      20
      };
      // console.log(grepCell);
      let cnReg = /^\s+option\surc1\.cnhost\s(172\.\d{1,3}\.\d{1,3}\.\d{1,3});\s*$/;
      let cnHost = cnReg.exec(data)[1];
      renderObj.rnc = rncHash[cnHost];
    });
  }
  return renderObj;
}

function parseRequest(reqArr, data, renderObj) {
  for ( let i in reqArr ) {
    let timePtrn = /(\s+\d\d:\d\d:\d+)\.\d+\sIP\s\(tos\s.*,\sttl\s\d+,\sid\s\d+,\soffset\s\d+,\sflags\s\[.*\],\sproto\sUDP\s\(17\),\slength\s\d+\)/;
    let time = timePtrn.exec(data);
    if ( time ) {
      time = time[1];
    }
    let reqPtrn = /\s+DHCP-Message\sOption\s\d+,\slength\s\d+:\s(\w+)/;         // Request Type
    let reqType = reqPtrn.exec(reqArr[i]);
    if ( reqType ) {
      reqType = reqType[1];
      if ( reqType == "Request" ) {
        strColor = "#D8BFD8";                                                   // pink
      }
      else if ( reqType == "Discover" ) {
        strColor = "#FFFF00";                                                   // yellow
      }
      else if ( reqType == "Offer" ) {
        strColor = "#00FFFF";                                                   // blue
      }
      else if ( reqType == "ACK" ) {
        strColor = "#00FF00";                                                   // green
        }
    }

    let cellPtrn = /.*\s\"\w(cell\d{1,4}-\d)\"\s.*/                             // Cell
    let cell = cellPtrn.exec(reqArr[i]);
    if ( cell ) {
     cell = cell[1];
    }

    let macPtrn = /.*\s+Client-ID\sOption\s\d+,\slength\s\d+:\sether\s(\w\w:\w\w:\w\w:\w\w:\w\w:\w\w)\s.*/     // MAC
    let mac = macPtrn.exec(reqArr[i]);
    if ( mac ) {
     mac = mac[1];
    }

    let ipPtrn = /.*\s+Client-IP\s(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s.*/     // IP
    let ip = ipPtrn.exec(reqArr[i]);
    if ( ip ) {
     ip = ip[1];
    }

    if ( reqType || cell || mac || ip ) {
      renderObj = {"time": time, "reqType": reqType, "cell": cell, "ip": ip, "mac": mac, "reqColor": strColor};
      getRNC(cell, renderObj);
    }
    renderArr[i] = renderObj;
  }
  return renderArr;
}

function parseVoice(voiceArr) {
  for ( let i in voiceArr ) {
    let vreqPtrn = /^DHCP:\sMessage\stype\s=\s(\w+)$/;
    let vreqType = vreqPtrn.exec(voiceArr[i]);
    if ( vreqType ) {
      vreqType = vreqType[1];
      if ( vreqType == "DHCPREQUEST" ) {
        strColor = "#D8BFD8";                                                   // pink
      }
      else if ( vreqType == "DHCPDISCOVER" ) {
        strColor = "#FFFF00";                                                   // yellow
      }
    }
    let vmacPtrn = /^DHCP:\sClient\sIdentifier\s=\s+0x\w\w\s0x(\w\w)\s0x(\w\w)\s0x(\w\w)\s0x(\w\w)\s0x(\w\w)\s0x(\w\w)\s\(unprintable\)$/     // MAC
    let vmac = vmacPtrn.exec(voiceArr[i]);
    if ( vmac ) {
      vmac = `${vmac[1]}:${vmac[2]}:${vmac[3]}:${vmac[4]}:${vmac[5]}:${vmac[6]}`;
    }
    let vipPtrn = /^DHCP:\sRequested\sIP\sAddress\s=\s(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/     // IP
    let vip = vipPtrn.exec(voiceArr[i]);
    if ( vip ) {
      vip = vip[1];
    }
    let vtime = getTime();

    if ( vreqType || vmac || vip ) {
      renderVArr[i] = {"time": vtime, "mac": vmac, "reqType": vreqType, "ip": vip, "reqColor": strColor};
    }
  }
  return renderVArr;
}

function getTime() {
  let myDate = new Date();
  let hour = myDate.getHours();
  let minute = myDate.getMinutes();
  let second = myDate.getSeconds();
  if (minute < 10) {
    minute = "0" + minute;
  }
  if (second < 10) {
    second = "0" + second;
  }
  let myTime = `${hour}:${minute}:${second}`;
  return myTime;
}

// Read RSSI from file
//9224: grep -A20 'OP:CELL 2153 CDM 1, 2, CBR ' /omp-data/logs/OMPROP1/*.APX | grep 'CBR AVERAGE'
//9917: grep -B1 -A5 'DIV_IMB THRESHOLD: 5.0' ../ROP/Alarm/grep_alarm.log

function readRssi(bts) {
  fs.readFile(__dirname + "/inputRequest/rssi.log", "utf8", (error, data) => {
       if (error) {
          throw error;
          console.log("Cannot open rssi.log");
       }
       let strArr = data.split(/\n/);
       let rssiPtrn = /\[\[\s*.*\s*,\s*.*\s*,\s*.*\s*\],.*\[(\d{1,4})\]\s*\]/;
       for ( let i=0; i<strArr.length; i++ ) {
         let strBts = rssiPtrn.exec(strArr[i]);
         try {
           if ( strBts[1] == bts ) {
             rssiData = strBts[0];
             return rssiData;
           }
         }
         catch (error) {
           console.log(error);
         }
       }
    });
}
