// -----------------------------------------------------------------------------
// モジュールのインポート
const server = require("express")();
const line = require("@line/bot-sdk"); // Messaging APIのSDKをインポート
const dialogflow = require("dialogflow");
const db = require('./db/db');          // DB
var client = db.pool;
//client.connect();
console.log(client.connect());


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
            console.log(event.message.text);

            //死活確認
            if (event.message.text == "生きてる？"){
                // replyMessage()で返信し、そのプロミスをevents_processedに追加。
                events_processed.push(bot.replyMessage(event.replyToken, {
                    type: "text",
                    text: "(っ＾ω＾ｃ)"
                }));
            }

            //group_id確認
            if (event.message.text == "info"){
                // replyMessage()で返信し、そのプロミスをevents_processedに追加。
                var group_id = event.source.groupId;
                var user_id = event.source.userId;
                var room_id = event.source.roomId;
                events_processed.push(bot.replyMessage(event.replyToken, {
                    type: "text",
                    text: "user_id: "+user_id+" group_id: "+group_id+" room_id: "+room_id
                }));
            }

            //leave
            if (event.message.text == "leave"){
                // replyMessage()で返信し、そのプロミスをevents_processedに追加。
                var group_id = event.source.groupId;
                var user_id = event.source.userId;
                var room_id = event.source.roomId;
                bot.leaveGroup(group_id)
                    .then(() => {

                    })
                    .catch((err) => {
                        // error handling
                });
            }

            //登録
            var reg_result = /登録\[([^,]*),([\s\S]*)\]/.exec(event.message.text);
            if(reg_result != null){
                var key = reg_result[1];
                var value = reg_result[2];
                console.log("-----------------")
                try {
                    client.query("INSERT INTO Kaomoji (key, value) VALUES ($1, $2);", [key, value], (err, result) => {
                        console.log("try insert")
                        if(result != undefined) {
                            console.log("(っ登ω録ｃ)try!");

                            events_processed.push(bot.replyMessage(event.replyToken, {
                                type: "text",
                                text: "(っ登ω録ｃ)"
                            }));
                            console.log("(っ登ω録ｃ)");
                        } else{
                            console.log("(っ´＾ω＾`ｃ)");
                        }

                    });

                } catch (e) {
                    console.log(e);
                    console.error(e);
                }
                console.log("-----------------")

            }

            //メッセージをkeyにDBでwhereし、valueを抽出する
            console.log("Try Read(っ＾ω＾ｃ)");

            console.log(event.message.text);
            console.log("(っ＾ω＾ｃ)DB connect");
            client.query("SELECT value FROM kaomoji WHERE key = $1", [event.message.text], (err, result) => {
                var res;
                if(result != undefined) {
                    if(result.rows.length != 0 ){
                        console.log("(っ＾ω＾ｃ)");

                        res = result.rows[Math.floor(Math.random() * result.rows.length)].value;

                        console.log(res);
                        events_processed.push(bot.replyMessage(event.replyToken, {
                            type: "text",
                            text: res
                        }));
                    }else {
                        console.log("(っ0ω0ｃ)");
                    }
                } else{
                    console.log("(っ´＾ω＾`ｃ)");
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
