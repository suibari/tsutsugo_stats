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
  var woba = (0.72*(stat.bb-stat.ibb) + 0.75*stat.hbp + 0.90*(stat.tb-2*stat.d-3*stat.t-4*stat.hr) + 0.92*stat.roe + 1.24*stat.d + 1.56*stat.t + 1.95*stat.hr)/stat.tpa;
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

//======================================================================
// 以下helper :
//======================================================================
// 最初にこの関数を実行し、ログに出力されたURLにアクセスしてOAuth認証する
function twitterAuthorizeUrl() {
  Twitter.oauth.showUrl();
}

// OAuth認証成功後のコールバック関数
function twitterAuthorizeCallback(request) {
  return Twitter.oauth.callback(request);
}

// OAuth認証のキャッシュをを削除する場合はこれを実行（実行後は再度認証が必要）
function twitterAuthorizeClear() {
  Twitter.oauth.clear();
}


var Twitter = {
  projectKey: PropertiesService.getScriptProperties().getProperty('PROJECT_KEY'),
  
  consumerKey: PropertiesService.getScriptProperties().getProperty('CONSUMER_KEY'),
  consumerSecret: PropertiesService.getScriptProperties().getProperty('CONSUMER_SECRET'),
  
  apiUrl: "https://api.twitter.com/1.1/",
  
  oauth: {
    name: "twitter",
    
    service: function(screen_name) {
      // 参照元：https://github.com/googlesamples/apps-script-oauth2
      
      return OAuth1.createService(this.name)
      // Set the endpoint URLs.
      .setAccessTokenUrl('https://api.twitter.com/oauth/access_token')
      .setRequestTokenUrl('https://api.twitter.com/oauth/request_token')
      .setAuthorizationUrl('https://api.twitter.com/oauth/authorize')
      
      // Set the consumer key and secret.
      .setConsumerKey(this.parent.consumerKey)
      .setConsumerSecret(this.parent.consumerSecret)
      
      // Set the project key of the script using this library.
      .setProjectKey(this.parent.projectKey)
      
      
      // Set the name of the callback function in the script referenced
      // above that should be invoked to complete the OAuth flow.
      .setCallbackFunction('twitterAuthorizeCallback')
      
      // Set the property store where authorized tokens should be persisted.
      .setPropertyStore(PropertiesService.getUserProperties());
    },
    
    showUrl: function() {
      var service = this.service();
      if (!service.hasAccess()) {
        Logger.log(service.authorize());
      } else {
        Logger.log("認証済みです");
      }
    },
    
    callback: function (request) {
      var service = this.service();
      var isAuthorized = service.handleCallback(request);
      if (isAuthorized) {
        return HtmlService.createHtmlOutput("認証に成功しました！このタブは閉じてかまいません。");
      } else {
        return HtmlService.createHtmlOutput("認証に失敗しました・・・");
      }
    },
    
    clear: function(){
      OAuth1.createService(this.name)
      .setPropertyStore(PropertiesService.getUserProperties())
      .reset();
    }
  },
  
  api: function(path, data) {
    var that = this, service = this.oauth.service();
    if (!service.hasAccess()) {
      Logger.log("先にOAuth認証してください");
      return false;
    }
    
    path = path.toLowerCase().replace(/^\//, '').replace(/\.json$/, '');
    
    var method = (
         /^statuses\/(destroy\/\d+|update|retweet\/\d+)/.test(path)
      || /^media\/upload/.test(path)
      || /^direct_messages\/(destroy|new)/.test(path)
      || /^friendships\/(create|destroy|update)/.test(path)
      || /^account\/(settings|update|remove)/.test(path)
      || /^blocks\/(create|destroy)/.test(path)
      || /^mutes\/users\/(create|destroy)/.test(path)
      || /^favorites\/(destroy|create)/.test(path)
      || /^lists\/[^\/]+\/(destroy|create|update)/.test(path)
      || /^saved_searches\/(create|destroy)/.test(path)
      || /^geo\/place/.test(path)
      || /^users\/report_spam/.test(path)
      ) ? "post" : "get";
    
    var url = this.apiUrl + path + ".json";
    var options = {
      method: method,
      muteHttpExceptions: true
    };
    
    if ("get" === method) {
      if (!this.isEmpty(data)) {
        // 2015/07/07 再度修正
        // 旧コード）
        // var queries = [];
        // for (var key in data) {
        //   // 2015/05/28 以下の部分を修正
        //   // 旧コード） queries.push(key + "=" + encodeURIComponent(data[key]));
        //   
        //   
        //   var encoded = encodeURIComponent(data[key]).replace(/[!'()*]/g, function(c) {
        //     return "%" + c.charCodeAt(0).toString(16);
        //   });
        //   queries.push(key + "=" + encoded);
        // }
        // url += '?' + queries.join("&");
        url += '?' + Object.keys(data).map(function(key) {
          return that.encodeRfc3986(key) + '=' + that.encodeRfc3986(data[key]);
        }).join('&');
      }
    } else if ("post" == method) {
      if (!this.isEmpty(data)) {
        // 2015/07/07 修正
        // 旧コード）options.payload = data;
        options.payload = Object.keys(data).map(function(key) {
          return that.encodeRfc3986(key) + '=' + that.encodeRfc3986(data[key]);
        }).join('&');
        
        if (data.media) {
          options.contentType = "multipart/form-data;charset=UTF-8";
        }
      }
    }

    try {
      var result = service.fetch(url, options);
      var json = JSON.parse(result.getContentText());
      if (json) {
        if (json.error) {
          throw new Error(json.error + " (" + json.request + ")");
        } else if (json.errors) {
          var err = [];
          for (var i = 0, l = json.errors.length; i < l; i++) {
            var error = json.errors[i];
            err.push(error.message + " (code: " + error.code + ")");
          }
          throw new Error(err.join("\n"));
        } else {
          return json;
        }
      }
    } catch(e) {
      this.error(e);
    }
    
    return false;
  },
  
  error: function(error) {
    var message = null;
    if ('object' === typeof error && error.message) {
      message = error.message + " ('" + error.fileName + '.gs:' + error.lineNumber +")";
    } else {
      message = error;
    }
    
    Logger.log(message);
  },
  
  isEmpty: function(obj) {
    if (obj == null) return true;
    if (obj.length > 0)    return false;
    if (obj.length === 0)  return true;
    for (var key in obj) {
        if (hasOwnProperty.call(obj, key)) return false;
    }
    return true;
  },
  
  encodeRfc3986: function(str) {
    return encodeURIComponent(str).replace(/[!'()]/g, function(char) {
      return escape(char);
    }).replace(/\*/g, "%2A");
  },
  
  init: function() {
    this.oauth.parent = this;
    return this;
  }
}.init();


/********************************************************************
以下はサポート関数
*/

// ツイート検索
Twitter.search = function(data) {
  if ("string" === typeof data) {
    data = {q: data};
  }
  
  return this.api("search/tweets", data);
};

// 自分のタイムライン取得
Twitter.tl = function(since_id) {
  var data = null;
  
  if ("number" === typeof since_id || /^\d+$/.test(''+since_id)) {
    data = {since_id: since_id};
  } else if("object" === typeof since_id) {
    data = since_id;
  }
  
  return this.api("statuses/home_timeline", data);
};

// ユーザーのタイムライン取得
Twitter.usertl = function(user, since_id) {
  var path = "statuses/user_timeline";
  var data = {};
  
  if (user) {
    if (/^\d+$/.test(user)) {
      data.user_id = user;
    } else {
      data.screen_name = user;
    }
  } else {
    var path = "statuses/home_timeline";
  }
  
  if (since_id) {
    data.since_id = since_id;
  }
  
  return this.api(path, data);
};

// ツイートする
Twitter.tweet = function(data, reply) {
  var path = "statuses/update";
  if ("string" === typeof data) {
    data = {status: data};
  } else if(data.media) {
    path = "statuses/update_with_media ";
  }
  
  if (reply) {
    data.in_reply_to_status_id = reply;
  }
  
  return this.api(path, data);
};

// トレンド取得（日本）
Twitter.trends = function(woeid) {
  data = {id: woeid || 1118108};
  var res = this.api("trends/place", data);
  return (res && res[0] && res[0].trends && res[0].trends.length) ? res[0].trends : null;
};

// トレンドのワードのみ取得
Twitter.trendWords = function(woeid) {
  data = {id: woeid || 1118108};
  var res = this.api("trends/place", data);
  if (res && res[0] && res[0].trends && res[0].trends.length) {
    var trends = res[0].trends;
    var words = [];
    for(var i = 0, l = trends.length; i < l; i++) {
      words.push(trends[i].name);
    }
    return words;
  }
};