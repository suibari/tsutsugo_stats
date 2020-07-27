// JSONperse & tweet
function tweetandrecord() {
  // MLB APIから筒香STATS取得
  var stat = getTsutsugoSTAT();
  
  // SpreadSheetアクセス
  ctrlSpreadSheet.writeSTATS(stat);
  saveChartToGoogleDrive();
  var str_stats_tdy = ctrlSpreadSheet.getTextOfTodaySTATS();
  
  // search news
  //var url = getTsutsugoNewsURL();
  
  // ツイート文生成、statusオブジェクト作成
  var status_text = "MLB筒香成績botがお知らせします("+stat.end_date+")\n"+
                    "今日は、" + str_stats_tdy + "\n"+
                    "\n"+
                    "通算: "+stat.g+"試合"+stat.ab+"打数"+stat.h+"安打"+stat.hr+"本塁打\n"+
                    "AVG(打率): "+stat.avg+"\n"+
                    "OBP(出塁率): "+stat.obp+"\n"+
                    "OPS: "+stat.ops+"\n"+
                    "wOBA: "+stat.woba+" "+getConditionByWOBA(stat.woba)+"\n"+
                    "\n"+
                    "Go, go, Tsutsugo!!\n"+
                    "#baystars #筒香嘉智 #RaysUp\n"+
                    "\n"+
                    "GitHub: "+"https://github.com/suibari/tsutsugo_stats";
  var obj_status = {status: status_text};

  // 筒香video検索、あったらstatusオブジェクトに追加
  var url = searchTsutsugoMovie();
  if (url) {
    obj_status.attachment_url = url.slice(0,-8); // 末尾の"/video/1"を削除するとattachment_urlに設定できる
  }
  
  // グラフをstatusオブジェクトに追加
  obj_status.media_ids = getMediaStringIdOfChart();
  
  // ツイートする
  Twitter.tweet(obj_status);
  
  //----
  function getConditionByWOBA(woba) {
    var THRD_VGD = 0.450;
    var THRD_GD  = 0.360;
    var THRD_AVG = 0.330;
    var THRD_NML = 0.300;
    
    var condition;
    if (woba > THRD_VGD) {
      // 絶好調
      condition = "(絶好調!!🤩)";
    } else if (woba > THRD_GD) {
      // 好調
      condition = "(好調!😊)";
    } else if (woba > THRD_AVG) {
      // 平均以上
      condition = "(平均以上😀)";
    } else if (woba > THRD_NML) {
      // ぼちぼち
      condition = "(平均的😐)";
    } else {
      // 不調
      condition = "(不調…😖)";
    }
    
    return condition;
  };
};

// access spreadsheet
var ctrlSpreadSheet = { 
  
  r_stat : {
    end_date: '2',
    g       : '3',  // game (試合数)
    tpa     : '4',  // total plate appearance (打席数)
    ab      : '5',  // at bat (打数)
    r       : '6',  // run (得点)
    h       : '7',  // hit (安打)
    d       : '8',  // double
    t       : '9',  // triple
    hr      : '10', // homerun
    tb      : '11', // 塁打数
    //xbh     : '10', // extra base hit (塁打数)
    rbi     : '12', // runs batted in (打点)
    sb      : '13', // steelng base
                    // caught steeling
                    // sacrifice hit (犠打)
    sf      : '16', // sacrifice fly (犠飛)
    bb      : '17', // base on ball (四球)
    hbp     : '18', // hit by pitch (死球)
    so      : '19', // strikeout
    gidp    : '20', // ground into double play (併殺打)
    avg     : '21',
    obp     : '22',
    slg     : '23',
    ops     : '24',
    babip   : '25',
    ppa     : '26', // 被投球数
    go_ao   : '27', // ground outs/air outs(ゴロアウト比率:平均1.08)
    ibb     : '28', // intentional bb(敬遠)
    roe     : '29', // reached on error(失策出塁)
    woba    : '30', // wOBA<weighted on base average>
    pak     : '31', // Plate Appearance/K (1三振あたりの打席数)
    bbk     : '32'  // Base on Ball /K (選球眼)
  },
  
  writeSTATS : function (stat) { 
    var sht   = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var l_row = sht.getLastRow();
    
    // スクリプト動作日付を記入
    var date  = new Date();
    sht.getRange(l_row+1, 1).setValue(date);
    
    // API取得データを記入
    for (var key in this.r_stat) {
      var col = this.r_stat[key];
      var v   = stat[key];
      sht.getRange(l_row+1, col).setValue(v);
    }
    return;
  },
  
  getTodaySTATS : function (key) {
    var sht = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var l_row = sht.getLastRow();
    
    if (l_row == 2) {
      // シーズン1試合目の場合、前日との差でその日の打数を表せない
      var stat_tdy = sht.getRange(l_row, this.r_stat[key]).getValue();
    } else {  
      var stat_tdy = sht.getRange(l_row, this.r_stat[key]).getValue() - sht.getRange(l_row-1, this.r_stat[key]).getValue();
    }
    
    return stat_tdy;
  },
  
  getTextOfTodaySTATS : function () {
    var sht = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var l_row = sht.getLastRow();
    
    var g_tdy = sht.getRange(l_row,   this.r_stat.g).getValue();
    var g_ytd = sht.getRange(l_row-1, this.r_stat.g).getValue();
    
    if ((g_tdy > g_ytd) || (g_tdy == 1)) {
      //出場した。今日の成績を取得
      var result = this.getTodaySTATS('ab') + "打数" + this.getTodaySTATS('h') + "安打";
      if (this.getTodaySTATS('so') > 0) result = result + this.getTodaySTATS('so')  + "三振";    // 三振が0なら非表示
      if (this.getTodaySTATS('rbi')> 0) result = result + this.getTodaySTATS('rbi') + "打点";    // 打点が0なら非表示
      if (this.getTodaySTATS('bb') > 0) result = result + this.getTodaySTATS('bb')  + "四球";    // 四球が0なら非表示
      if (this.getTodaySTATS('hr') > 0) result = result + this.getTodaySTATS('hr')  + "本塁打";  // HRが0なら非表示
      result = result + "でした。"
      return result;
      
    } else {
      //出場してない
      return "試合には出ませんでした。";
    }
  }
};

// MLB APIアクセス
function getTsutsugoSTAT() {
  var BASE_URL  = 'http://lookup-service-prod.mlb.com/';
  var GAME_TYPE = 'R';
  var SEASON    = '2020';
  var PLAYER_ID = '660294';   //tsutsugo's ID
  
  var API_URL = "json/named.sport_hitting_tm.bam?league_list_id='mlb'&game_type='"+GAME_TYPE+"'&season='"+SEASON+"'&player_id='"+PLAYER_ID+"'";
  var result  = requestAPI(BASE_URL+API_URL, 'get');
  var stat    = result.body.sport_hitting_tm.queryResults.row;
  stat.end_date = stat.end_date.toString().substr(0,10);   //end_dateはyyyy-mm-dd形式にする
  
  // calculate wOBA : https://1point02.jp/op/gnav/glossary/gls_explanation.aspx?eid=20040
  var woba = (0.72*(stat.bb-stat.ibb) + 0.75*stat.hbp + 0.90*(stat.tb-2*stat.d-3*stat.t-4*stat.hr) +
              0.92*stat.roe + 1.24*stat.d + 1.56*stat.t + 1.95*stat.hr)/stat.tpa;
  stat.woba = Math.round(woba*1000)/1000;  // 0.xxx 形式に丸める
  
  // calculate PA/K
  var pak = stat.tpa / stat.so;
  stat.pak = Math.round(pak*100)/100;
  
  // calculate BB/K
  var bbk = stat.bb / stat.so;
  stat.bbk = Math.round(bbk*1000)/1000;
  
  //writeSheet(stat);
  Logger.log(stat);
  return stat;
  
  //----
  function requestAPI(url, method) {
    var urlFetchOption = {
      'method' : (method || 'get'),    
      'contentType' : 'application/json; charset=utf-8',
      'muteHttpExceptions' : true
    };
  
    var response = UrlFetchApp.fetch(url, urlFetchOption);
    try {
      return {
        responseCode : response.getResponseCode(),
        rateLimit : {
          limit : response.getHeaders()['X-RateLimit-Limit'],
          remaining : response.getHeaders()['X-RateLimit-Remaining'],
        },
        parseError : false,
        body : JSON.parse(response.getContentText()),
        bodyText : response.getContentText()
      };
    } catch(e) {
      return {
        responseCode : response.getResponseCode(),
        rateLimit : {
          limit : response.getHeaders()['X-RateLimit-Limit'],
          remaining : response.getHeaders()['X-RateLimit-Remaining'],
        },      
        // 何らかのエラーが発生した場合、parseError=trueにする
        parseError : true,
        // JSON.parse(response.getContent())で落ちる時があるので、そん時はbody=null返す
        // TODO:ただ、今は呼出元でnull返しの対処はしてない。。。
        body : null,
        bodyText : response.getContentText()
      };
    };
  };
};

function getTsutsugoNewsURL() {
  var feedURL = "http://www.mlb.jp/category/news/feed/?rss";

  // フィードを取得
  var response = UrlFetchApp.fetch(feedURL);
  var xml = XmlService.parse(response.getContentText());
  var items = xml.getRootElement().getChildren('channel')[0].getChildren('item');
  
  var md = getNowMD();
  for(var i=0; i<items.length; i++) {
    //var category = items[i].getChild("category").getText().indexOf("筒香");
    var title   = items[i].getChild("title").getText().indexOf("筒香");
    var pubdate = items[i].getChild("pubDate").getText().indexOf(md);
    if (~ title && ~ pubdate) {
      //タイトルに"筒香"が含まれる　かつ　本日のニュースである
      var url   = items[i].getChild("link").getText();// 記事URL
    } 
  }
  Logger.log(url);
  return url;
 
  function getNowMD(){
    const month_english_list = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    
    var dt = new Date();
    var m_en = month_english_list[dt.getMonth()];
    var d = ("00" + dt.getDate()).slice(-2);
    var result = d + " " + m_en;
    return result;
  };
};

function searchTsutsugoMovie() {
  
  var PASTDAY = 1; //何日前のtweetから検索対象にするか
  
  var req = {q: "(tsutsugo OR 筒香) -RT filter:videos since:"+getPastDate(PASTDAY), //x日前から今までの、tsutsugoまたは筒香が含まれる動画付きツイート(RTではない)
             result_type: 'mixed'};
  var status = Twitter.search(req).statuses[0];
  if (status) {
    var result = status.extended_entities.media[0].expanded_url;
  }
  Logger.log(result);
  
  return result;
  
  function getPastDate(pastday) {
    var dt   = new Date();
    dt.setDate(dt.getDate() - pastday);
    
    var y  = dt.getFullYear();
    var m  = dt.getMonth()+1;
    var d  = dt.getDate();
    var result = y+"-"+m+"-"+d;
    Logger.log(result);
    
    return result;
  }
}
