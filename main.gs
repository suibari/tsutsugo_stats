// JSONperse & tweet
function tweetandrecord() {
  // MLB APIから筒香STATS取得
  var stat = getTsutsugoSTAT();
  
  // SpreadSheetに追記
  writeSheet(stat);
  
  // search news
  //var url = getTsutsugoNewsURL();
  
  // ツイート文生成、statusオブジェクト作成
  var status_text = "MLB筒香成績botが現在の筒香をお知らせします("+stat.end_date+")\n"+
                    "\n"+
                    stat.g+"試合"+stat.ab+"打数"+stat.h+"安打"+stat.hr+"本塁打\n"+
                    "AVG(打率): "+stat.avg+"\n"+
                    "OBP(出塁率): "+stat.obp+"\n"+
                    "OPS: "+stat.ops+"\n"+
                    "wOBA: "+stat.woba+" "+getConditionByWOBA(stat.woba)+"\n"+
                    "\n"+
                    "Go, go, Tsutsugo!!\n"+
                    "#baystars #筒香嘉智 #RaysUp";
  var obj_status = {status: status_text};

  // 筒香video検索、あったらstatusオブジェクトに追加
  var url = searchTsutsugoMovie();
  if (url) {
    obj_status.attachment_url = url.slice(0,-8); // 末尾の"/video/1"を削除するとattachment_urlに設定できる
  }
  
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

// write spreadsheet
function writeSheet(stat) {
  var sht = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var r_stat = {
    end_date: '1',
    g       : '2',  // game (試合数)
    tpa     : '3',  // total plate appearance (打席数)
    ab      : '4',  // at bat (打数)
    r       : '5',  // run (得点)
    h       : '6',  // hit (安打)
    d       : '7',  // double
    t       : '8',  // triple
    hr      : '9',  // homerun
    tb      : '10', // 塁打数
    //xbh     : '10', // extra base hit (塁打数)
    rbi     : '11', // runs batted in (打点)
    sb      : '12', // steelng base
                    // caught steeling
                    // sacrifice hit (犠打)
    sf      : '15', // sacrifice fly (犠飛)
    bb      : '16', // base on ball (四球)
    hbp     : '17', // hit by pitch (死球)
    so      : '18', // strikeout
    gidp    : '19', // ground into double play (併殺打)
    avg     : '20',
    obp     : '21',
    slg     : '22',
    ops     : '23',
    babip   : '24',
    ppa     : '25', // 被投球数
    go_ao   : '26', // ground outs/air outs(ゴロアウト比率:平均1.08)
    ibb     : '27', // intentional bb(敬遠)
    roe     : '28', // reached on error(失策出塁)
    woba    : '29'  // wOBA<weighted on base average>
  };
    
  var r_w = sht.getLastRow() + 1;
  
  Object.keys(r_stat).forEach(function(key) {
    sht.getRange(r_w, r_stat[key]).setValue(stat[key]);
  });
  
  return;
};

// MLB APIアクセス
function getTsutsugoSTAT() {
  var BASE_URL  = 'http://lookup-service-prod.mlb.com/';
  var GAME_TYPE = 'S';
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
  
  var PASTDAY = 3; //何日前のtweetから検索対象にするか
  
  var req = {q: "tsutsugo filter:videos since:"+getPastDate(PASTDAY),
             result_type: 'popular'};
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
