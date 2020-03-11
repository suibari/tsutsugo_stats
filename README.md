筒香成績Bot
====

MLBプレイヤーの[筒香嘉智](https://www.mlb.com/player/yoshitomo-tsutsugo-660294)選手の成績を取得し、毎日Twitterに投稿するGoogle Apps Scriptです。

## Description

本アプリケーションは以下の機能を有します。
* MLB APIを通じた筒香嘉智の通算成績取得
* APIからは得られない前日の試合成績取得
* APIからは得られない特殊な指標(wOBA:weighted On Base Average)等の算出
* Google Spread Sheetへの記録
* 記録したデータの集計(グラフ化)
* Twitterへの成績Summaryの投稿
* Twitterへの成績推移グラフの投稿
* Twitterへの最近の筒香の動画の検索と引用RT投稿

本アプリケーションは以下のAPIを利用します。
* [MLB Data API](https://appac.github.io/mlb-data-api-docs/)
* [Twitter API](https://developer.twitter.com/ja/docs/ads/general/api-reference)

本アプリケーションでは以下のHelper Codeを流用させていただきました。
* https://github.com/gsuitedevs/apps-script-oauth1/blob/master/samples/Twitter.gs

## License
MIT
