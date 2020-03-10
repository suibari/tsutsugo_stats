var FOLDER_ID = '1Cc5Rbx7miQ0W_tG3EIooCt5fOodWLz9P';
var FILE_NAME = 'stats.png'

function saveChartToGoogleDrive() {
  
  //シート名をして指定してシートを取得します。今回の場合は「graph」シート
  var mySheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  //getChartsメソッドでシート内のチャートを取得します。配列で取得されます。
  var charts  = mySheet.getCharts();
  
  //charts配列に格納されたデータから0番目のグラフを画像として取得
  var imageBlob = charts[0].getBlob().getAs('image/png').setName(FILE_NAME);
  
  //フォルダIDを指定して、フォルダを取得
  var folder = DriveApp.getFolderById(FOLDER_ID);
  
  //フォルダにcreateFileメソッドを実行して、ファイルを作成
  folder.createFile(imageBlob);
}

function getMediaStringIdOfChart() {
  var file_temp = DriveApp.getFolderById(FOLDER_ID).getFilesByName(FILE_NAME).next();//GoogleDriveから画像を取得

  var resp = file_temp.getBlob();
  var resp_64 = Utilities.base64Encode(resp.getBytes());//Blobを経由してBase64に変換

  var img_option = { 'method':"POST", 'payload':{'media_data':resp_64} };
  var image_upload = JSON.parse(Twitter.oauth.service().fetch("https://upload.twitter.com/1.1/media/upload.json",img_option)); //upload to Twitter
  return image_upload.media_id_string;
  
  //var sendmsg = "てすと"; 
  //var sendoption = { 'status':sendmsg, 'media_ids':image_upload['media_id_string']} ;//オプションに突っ込む

  //Twitter.api('statuses/update',sendoption);//送信 
}