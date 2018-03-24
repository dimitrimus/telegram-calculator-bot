const https = require('https');

class CalculatorBot {
    constructor(token) {
        this.token = token;
        this.keyboardMarkup = {
            inline_keyboard: [
                [{text: 'AC', callback_data: 'AC'}, {text: '+', callback_data: '+'}, {text: '-', callback_data: '-'}],
                [{text: '7', callback_data: '7'}, {text: '8', callback_data: '8'}, {text: '9', callback_data: '9'}],
                [{text: '4', callback_data: '4'}, {text: '5', callback_data: '5'}, {text: '6', callback_data: '6'}],
                [{text: '1', callback_data: '1'}, {text: '2', callback_data: '2'}, {text: '3', callback_data: '3'}],
                [{text: '0', callback_data: '0'}]
            ]
        };
        this.states = {};
    }

    onMessageReceive(message) {
        console.log(message);
        if (message.text == '/start') {
            bot.sendMessage(message.chat.id, "0");
        }
    }

    onCallbackReceive(callback_query) {
        console.log(callback_query);
        const { id, message, data } = callback_query;
        
        const stateKey = message.chat.id + '#' + message.message_id;
        if (!this.states[stateKey]) {
            this.states[stateKey] = {
                accumulator: 0,
                lastOperation: '+',
                lastPressedButton: null
            }
        }
        let state = this.states[stateKey];
    
        if (data == 'AC') {
            state.accumulator = 0;
            state.lastOperation = '+';
            state.lastPressedButton = null;
            bot.editMessageText(message.chat.id, message.message_id, state.accumulator);
            return;
        }
    
        if (data == '+' || data == '-') {
            if (state.lastPressedButton == '+' || state.lastPressedButton == '-') {
                state.lastOperation = data;
            } else {
                const currentNumber = parseInt(message.text);
                state.accumulator = state.lastOperation == '+' ? 
                    state.accumulator + currentNumber : state.accumulator - currentNumber;
                state.lastOperation = data;
                bot.editMessageText(message.chat.id, message.message_id, state.accumulator);
            }
        }
        else {
            let newText;
            if (state.lastPressedButton == '+' || state.lastPressedButton == '-') {
                newText = data;
            } else {
                if (message.text == '0') {
                    newText = data;
                } else {
                    newText = message.text + data;
                }
            }
            bot.editMessageText(message.chat.id, message.message_id, newText);
        }
        state.lastPressedButton = data;
    
        bot.answerCallback(id);
    }

    run() {
        let nextUpdateId = 0;
        let getUpdates = () => {
            const url = `https://api.telegram.org/bot${this.token}/getUpdates?offset=${nextUpdateId}`;
            this.makeHttpGetRequest(url, (response) => {
                if (response.ok) {
                    response.result.forEach(element => {
                        if (element.hasOwnProperty('message')) {
                            this.onMessageReceive(element.message);
                        } else if (element.hasOwnProperty('callback_query')) {
                            this.onCallbackReceive(element.callback_query)
                        }
                        nextUpdateId = element.update_id + 1;
                    });
                }
                setTimeout(getUpdates, 100);
            });
        };
        getUpdates();
    }

    sendMessage(chatId, text) {
        this.makeHttpPostRequest('sendMessage', JSON.stringify({
            chat_id: chatId,
            text: text,
            reply_markup: this.keyboardMarkup
        }));
    }

    editMessageText(chatId, messageId, text) {
        this.makeHttpPostRequest('editMessageText', JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: text,
            reply_markup: this.keyboardMarkup
        }));
    }

    answerCallback(callbackId) {
        this.makeHttpPostRequest('answerCallbackQuery', JSON.stringify({
            callback_query_id: callbackId
        }));
    }

    makeHttpPostRequest(command, json) {
        const postOptions = {
            host: 'api.telegram.org',
            path: `/bot${this.token}/${command}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(json)
            }
        };
      
        var postRequest = https.request(postOptions, function(res) {
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                console.log('Response: ' + chunk);
            });
        });
      
        postRequest.write(json);
        postRequest.end();
    }

    makeHttpGetRequest(url, callback) {
        https.get(url, (res) => {
            const { statusCode } = res;
            const contentType = res.headers['content-type'];
        
            let error;
            if (statusCode !== 200) {
                error = new Error('Request Failed.\n' +
                                `Status Code: ${statusCode}`);
            } else if (!/^application\/json/.test(contentType)) {
                error = new Error('Invalid content-type.\n' +
                                `Expected application/json but received ${contentType}`);
            }
            if (error) {
                console.error(error.message);
                res.resume();
                return;
            }
        
            res.setEncoding('utf8');
            let rawData = '';
            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(rawData);
                    console.log(parsedData);
                    if (callback) {
                        callback(parsedData);
                    }
                } catch (e) {
                    console.error(e.message);
                }
            });
        }).on('error', (e) => {
            console.error(`Got error: ${e.message}`);
        });
    }
}

const bot = new CalculatorBot(process.env.TOKEN);
bot.run();
