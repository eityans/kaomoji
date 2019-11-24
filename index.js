// -----------------------------------------------------------------------------
// モジュールのインポート
const server = require("express")();
const line = require("@line/bot-sdk"); // Messaging APIのSDKをインポート
const dialogflow = require("dialogflow");

// DBのテスト
const router = server;

const db = require('./db/db');

router.get('/', (req, res, next) => {
  
  res.render('index', {
    title: 'hello express',
  });
});

// -----------------------------------------------------------------------------
// パラメータ設定
const line_config = {
    channelAccessToken: process.env.LINE_ACCESS_TOKEN, // 環境変数からアクセストークンをセットしています
    channelSecret: process.env.LINE_CHANNEL_SECRET // 環境変数からChannel Secretをセットしています
};

// -----------------------------------------------------------------------------
// Webサーバー設定
server.listen(process.env.PORT || 3000);



// APIコールのためのクライアントインスタンスを作成
const bot = new line.Client(line_config);

// Dialogflowのクライアントインスタンスを作成
const session_client = new dialogflow.SessionsClient({
    project_id: process.env.GOOGLE_PROJECT_ID,
    credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n")
    }
});

// -----------------------------------------------------------------------------
// ルーター設定
server.post('/bot/webhook', line.middleware(line_config), (req, res, next) => {
    // 先行してLINE側にステータスコード200でレスポンスする。
    res.sendStatus(200);

    // すべてのイベント処理のプロミスを格納する配列。
    let events_processed = [];

    // イベントオブジェクトを順次処理。
    req.body.events.map((event) => {
        // この処理の対象をイベントタイプがメッセージで、かつ、テキストタイプだった場合に限定。
        if (event.type == "message" && event.message.type == "text"){

            if (event.message.text == "カレーさんだよ"){
                // replyMessage()で返信し、そのプロミスをevents_processedに追加。
                events_processed.push(bot.replyMessage(event.replyToken, {
                    type: "text",
                    text: "(っ🍛＾ω＾🍛ｃ)"
                }));
            }
            
            
            db.pool.connect((err, client) => {
                if (err) {
                    console.log(err);
                } else {
                    //var str = unescape(encodeURIComponent(event.message.text));
                    //console.log(str);
                    client.query("SELECT value FROM kaomoji WHERE key = $1", [event.message.text], (err, result) => {
                        var res;
                        if(result != undefined) {
                            console.log("(っ＾ω＾ｃ)");
                            res = result.rows[0].value;
                            
                            console.log(res);
                            events_processed.push(bot.replyMessage(event.replyToken, {
                                type: "text",
                                text: res
                            }));
                        } else{
                            console.log("(っ´＾ω＾`ｃ)");
                        }
                        
                    });
                }
            });
            

            events_processed.push(
                session_client.detectIntent({
                    session: session_client.sessionPath(process.env.GOOGLE_PROJECT_ID, event.source.userId),
                    queryInput: {
                        text: {
                            text: event.message.text,
                            languageCode: "ja",
                        }
                    }
                }).then((responses) => {
                    if (responses[0].queryResult && responses[0].queryResult.action == "emotion"){
                        let message_text
                        message_text = "(っ＾ω＾ｃ)♪"
                        /*
                        if (responses[0].queryResult.parameters.fields.menu.stringValue){
                            message_text = `毎度！${responses[0].queryResult.parameters.fields.menu.stringValue}ね。どちらにお届けしましょ？`;
                        } else {
                            message_text = `毎度！ご注文は？`;
                        }
                        */
                        return bot.replyMessage(event.replyToken, {
                            type: "text",
                            text: message_text
                        });
                    }
                })
            );


        }
    });

    // すべてのイベント処理が終了したら何個のイベントが処理されたか出力。
    Promise.all(events_processed).then(
        (response) => {
            console.log(`${response.length} event(s) processed.`);
        }
    );
});
