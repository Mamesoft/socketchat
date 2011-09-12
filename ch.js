var http = require('http'), url = require('url'), fs = require('fs');
var socketio=require('socket.io'),mongodb=require('mongodb');

//定数定義
DB_PORT=27017;
DB_NAME="socketchat";
CHAT_FIRST_LOG=100;	//最初どれだけログ表示するか
CHAT_MOTTO_LOG=100;	//HottoMotto時にログをどれだけ表示するか

CHAT_NAME_MAX_LENGTH = 25;
CHAT_MAX_LENGTH = 1000;

var mongoserver = new mongodb.Server("127.0.0.1",DB_PORT,{});
var db = new mongodb.Db(DB_NAME,mongoserver,{});


var httpserver = http.createServer(function(req, res){
	var parts=url.parse(req.url,true),path = parts.pathname;
	switch (path){
		case '/':
			path='/index.html';
		//HTML
		case '/index.html':
			fs.readFile(__dirname + path, function(err, data){
				if (err) return send404(res);
				res.writeHead(200, {'Content-Type': 'text/html'})
				res.write(data, 'utf8');
				res.end();
			});
			break;
		case '/log':
			fs.readFile(__dirname + path+".html", function(err, data){
				if (err) return send404(res);
				res.writeHead(200, {'Content-Type': 'text/html'})
				res.write(data, 'utf8');
				res.end();
			});
			break;
		//JS
		case '/line.js':
			fs.readFile(__dirname + path, function(err, data){
				if (err) return send404(res);
				res.writeHead(200, {'Content-Type': 'text/javascript'})
				res.write(data, 'utf8');
				res.end();
			});
			break;
		//CSS
		case '/css.css':
			fs.readFile(__dirname + path, function(err, data){
				if (err) return send404(res);
				res.writeHead(200, {'Content-Type': 'text/css'})
				res.write(data, 'utf8');
				res.end();
			});
			break;
		//API
		case '/chalog':
			chalog(parts.query,function(resobj){
				var result=JSON.stringify(resobj);
				res.writeHead(200,{
					//"Content-Length":result.length,
					"Content-Type":"text/javascript; charset=UTF-8",
				});
				res.write(result);
				res.end();
			});
			break;
		default: send404(res);
	}
	function send404(res){
		res.writeHead(404);
		res.write('404');
		res.end();
	}
});

var log,props;
//データベース使用準備
db.open(function(err,_db){
	if(err){
		console.log("DB Open err: "+err);
		throw err;
	}
	db.collection("log",function(err,collection){
		log=collection;
	});
	db.collection("props",function(err,collection){
		props=collection;
	});
});
var users=[],users_next=1;

var filters=[];

//拡張
//ｼｬﾍﾞｯﾀｰ
filters.push(function(logobj){
	var date=new Date(logobj.time);
	var minutes=date.getMinutes();
	if(minutes==0 || minutes==30){
		//半角カナに変換
		var table={
"ぁ":"ｧ", "あ":"ｱ", "ぃ":"ｨ", "い":"ｲ", "ぅ":"ｩ", "う":"ｳ", "ぇ":"ｪ", "え":"ｴ", "ぉ":"ｫ", "お":"ｵ",
"か":"ｶ","が":"ｶﾞ", "き":"ｷ","ぎ":"ｷﾞ", "く":"ｸ","ぐ":"ｸﾞ", "け":"ｹ","げ":"ｹﾞ", "こ":"ｺ","ご":"ｺﾞ",
"さ":"ｻ","ざ":"ｻﾞ", "し":"ｼ","じ":"ｼﾞ", "す":"ｽ","ず":"ｽﾞ", "せ":"ｾ","ぜ":"ｾﾞ", "そ":"ｿ","ぞ":"ｿﾞ",
"た":"ﾀ","だ":"ﾀﾞ", "ち":"ﾁ","ぢ":"ﾁﾞ", "っ":"ｯ", "つ":"ﾂ","づ":"ﾂﾞ", "て":"ﾃ","で":"ﾃﾞ", "と":"ﾄ","ど":"ﾄﾞ",
"な":"ﾅ", "に":"ﾆ", "ぬ":"ﾇ", "ね":"ﾈ", "の":"ﾉ",
"は":"ﾊ","ば":"ﾊﾞ","ぱ":"ﾊﾟ", "ひ":"ﾋ","び":"ﾋﾞ","ぴ":"ﾋﾟ", "ふ":"ﾌ","ぶ":"ﾌﾞ","ぷ":"ﾌﾟ", "へ":"ﾍ","べ":"ﾍﾞ","ぺ":"ﾍﾟ", "ほ":"ﾎ","ぼ":"ﾎﾞ","ぽ":"ﾎﾟ",
"ま":"ﾏ", "み":"ﾐ", "む":"ﾑ", "め":"ﾒ", "も":"ﾓ",
"ゃ":"ｬ", "や":"ﾔ", "ゅ":"ｭ", "ゆ":"ﾕ", "ょ":"ｮ", "よ":"ﾖ",
"ら":"ﾗ", "り":"ﾘ", "る":"ﾙ", "れ":"ﾚ", "ろ":"ﾛ", "わ":"ﾜ", "を":"ｦ", "ん":"ﾝ",
"ヴ":"ｳﾞ","ヷ":"ﾜﾞ", "ヰ":"ｲ", "ヸ":"ｲﾞ","ヹ":"ｴﾞ","ヺ":"ｦﾞ","ー":"ｰ", "ゕ":"ｶ","ゖ":"ｹ",
"゛":"ﾞ", "゜":"ﾟ",
		};
		var bgrs=["ｧｱｶｻﾀﾅﾊﾏﾔｬﾗﾜ","ｨｲｷｼﾁﾆﾋﾐﾘ","ｩｳｸｽﾂﾇﾌﾑﾕｭﾙ","ｪｴｹｾﾃﾈﾍﾒﾚ","ｫｵｺｿﾄﾉﾎﾓﾖｮﾛｦ"];
		var boin=["ｧ","ｨ","ｩ","ｪ","ｫ"];

		var comment=logobj.comment.replace(/[ァ-ヶ]/g,function(katakana){
			return String.fromCharCode(katakana.charCodeAt(0)+(0x3040-0x30A0));
		}).replace(/[ぁ-ゖ゛゜ヷ-ヺ]/g,function(hiragana){
			return table[hiragana] || hiragana;
		}).replace(/([ｦ-ﾟ]+)/g,function(katakanas){
			var ato="",last=null;
			var pt=katakanas.length;
			while(pt){
				last=katakanas[--pt];
				if(last=="ｰ" || last=="ﾞ" || last=="ﾟ"){
					continue;
				}
				break;
			}
			for(var i=0;i<5;i++){
				if(bgrs[i].indexOf(last)>=0){
					//母音
					for(var j=0;j<5;j++)katakanas+=boin[i];
					break;
				}
			}
			return katakanas;
		});
		logobj.comment=comment;
		
	}
});


httpserver.listen(8080);

var io=socketio.listen(httpserver);

io.sockets.on('connection',function(socket){
	//ユーザー登録
	var user=null;
	socket.on("regist",function(data){
		if(data.mode=="client"){
			//チャットクライアント
			socket.join("chatroom");
			sendFirstLog(socket);
			user=addUser(socket);

			//発言
			socket.on("say",function(data){
				says(socket,user,data);
			});

			//入退室
			socket.on("inout",function(data){
				inout(socket,user,data);
			});
	
			//HottoMotto
			socket.on("motto",function(data){
				motto(socket,user,data);
			});

			//いなくなった
			socket.on("disconnect",function(data){
				discon(socket,user);
			});
		}else if(data.mode=="chalog"){
			//Chalog
			socket.on("query",function(data){
				chalog(data,function(resobj){
					socket.emit("result",resobj);
				});
			});
		}
	});
	
});
function sendFirstLog(socket){
	log.find({},{"sort":[["time","desc"]],"limit":CHAT_FIRST_LOG}).toArray(function(err,docs){
		socket.emit("init",{"logs":docs});
	});
}
function addUser(socket){
	var user={"id":users_next,
		  "name":null,
		  "rom":true,
		  "ip":socket.handshake.address.address,
		  "ua":socket.handshake.headers["user-agent"],
		  };
	users.push(user);
	sendusers(socket);
	users_next++;
	return user;
}
function delUser(user){
	users=users.filter(function(x){return x!=user});
}
function says(socket,user,data){
	if(user.rom)return;
	
	if(data.comment.length>CHAT_MAX_LENGTH){
		return;
	}

	var logobj={"name":user.name,
		    "comment":data.comment,
		    "ip":user.ip,
		    "time":Date.now()
		    };


	makelog(socket,logobj);
}
function makelog(socket,logobj){
	filters.forEach(function(func){
		func(logobj);
	});
	log.insert(logobj,{"safe":true},function(err,docs){
		if(err){
			console.log(err);
			throw err;
		}
		socket.emit("log",logobj);
		socket.broadcast.to("chatroom").emit("log",logobj);
	});
}
function inout(socket,user,data){
	user.rom = !user.rom;
	if(!user.rom){
		if(data.name.length>CHAT_NAME_MAX_LENGTH){
			//文字数超過
			user.rom=true;
			return;
		}
		user.name=data.name;
	}
	//シスログ
	var syslog={"name" : (user.rom?"■退室通知":"■入室通知"),
		    "time":Date.now(),
		    "ip":user.ip,
		    "comment":"「"+user.name+"」さんが"+(user.rom?"退室":"入室"),
		    "syslog":true
	};
	makelog(socket,syslog);
	if(user.rom)user.name=null;

	sendusers(socket);
	socket.emit("userinfo",{"rom":user.rom});
	

}
function discon(socket,user){
	if(!user.rom){
		var syslog={"name" : "■失踪通知",
			    "time":Date.now(),
			    "ip":user.ip,
			    "comment":"「"+user.name+"」さんいない",
			    "syslog":true
		};
		makelog(socket,syslog);
	}
	delUser(user);
	sendusers(socket);
}
function motto(socket,user,data){
	var time=data.time;
	if(!time)return;
	
	log.find({"time":{$lt:time}},{"sort":[["time","desc"]],"limit":CHAT_MOTTO_LOG}).toArray(function(err,docs){
		var resobj={"logs":docs};
		socket.emit("mottoResponse",resobj);
	});
}
function sendusers(socket){
	var p={"users":users,"roms":users.filter(function(x){return x.rom}).length};
	socket.emit("users",p);
	socket.broadcast.to("chatroom").emit("users",p);
	
}

function chalog(query,callback){
	var page=parseInt(query.page) || 0;
	var value=parseInt(query.value) || 500;
	if(value>5000)value=5000;
	
	var queryobj={};
	
	var optobj={"sort":[["time","desc"]]};
	if(page)optobj.skip=page*value;
	optobj.limit=value;
	
	if(query.starttime){
		queryobj.time={$gte:query.starttime};
	}
	if(query.endtime){
		if(queryobj.time){
			queryobj.time["$lte"]=query.endtime;
		}else{
			queryobj.time={$lte:query.endtime};
		}
	}
	if(query.name){
		//一致
		queryobj.name=query.name;
	}
	if(query.ip){
		//一致
		queryobj.ip=query.ip;
	}
	if(query.comment){
		//服務
		queryobj.comment=new RegExp(query.comment.replace(/(\W)/g,"\\$1"));
	}
	
	var result=log.find(queryobj,optobj).toArray(function(err,docs){
		var resobj={"logs":docs};
		
		callback(resobj);
		
	});
}
