//include dependencies
var express = require('express');
var serveStatic = require('serve-static');
var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser');

var unless = require('express-unless');
var randomWords = require('random-words');
var Sentencer = require('sentencer');
var faker = require('faker');

//database stuff
var ObjectID = require('mongodb').ObjectID;
var mongo = require('mongodb').MongoClient;
var Logger = require('mongodb').Logger;

//file uploading stuff
var multer = require('multer');
var upload = multer ({ dest: 'uploads/'});

//include config file
var config = require('./server.conf');

//auth/token stuff
var session = require('client-sessions');
var csurf = require('csurf');
var jwt = require('jsonwebtoken');

var swaggerJSDoc = require('swagger-jsdoc');


//create express server and register global middleware
var app = express();
app.use(bodyParser.json());	
app.use(bodyParser.urlencoded({    
	extended: true
}));

app.use(cookieParser());

//serve files in /public and /uploads dir
app.use(serveStatic(__dirname + '/uploads'));

app.use(serveStatic(__dirname + '/public'));	

//API binds to interface pixidb:7000
app.listen(8080, function(){
	if(process.env.NODE_ENV === undefined)
		process.env.NODE_ENV = 'development';
	console.log("Server running on pixidb, port %d in %s mode.", this.address().port, process.env.NODE_ENV);
});

// test db connection
mongo.connect("mongodb://pixidb:27017/Pixidb", function(err, db) {
  if(!err) {
    console.log("We are connected");
  }
});


// functions
function api_authenticate(user, pass, req, res){
	mongo.connect('mongodb://pixidb:27017/Pixidb', function(err, db){
		 		  //Logger.setLevel('debug');
		if(err){ 
			console.log('MongoDB connection error...');
			return err;
		}
		console.log('user ' + user + ' pass ' + pass);
		db.collection('users').findOne({email: user, password: pass },function(err, result){
			if(err){
				console.log('Query error...');
				return err;
			}
			if(result !== null) {
					console.log('id ' + result);
					var user = result;
					//BIG VULNERABILITY
       				var payload = { user };
       				var token = jwt.sign(payload, config.session_secret);
       				res.json({message: "Token is a header JWT ", token: token});
				}

			
			else
				res.status(202).json({message: 'sorry pal, invalid login' });
		});
		
	});	
}

function api_register(user, pass, req, res){
	console.log('in register');
	mongo.connect('mongodb://pixidb:27017/Pixidb', function(err, db){
		 		  //Logger.setLevel('debug');
		if(err){ 
			console.log('MongoDB connection error...');
			return err;
		}
		console.log('user ' + user + ' pass ' + pass);
		user = user.toLowerCase();
		db.collection('users').findOne({ email: user },function(err, result){
			if(err){ return err; }
			if(result !== null) {
				res.status(202).json({message: user + ' is already registered.' });
				}

			
			else {
				if(req.body.is_admin) {
					var admin = true;
				}
				else {
					var admin = false
				}
				var name = randomWords({ exactly: 2 });
				name = name.join('');
				console.log(name);
				db.collection("counters")
				  .findAndModify(
					  	{ "_id": "userid" },
					  	[], 
						{ "$inc" : { "seq": 1 } },
					function(err, doc){
						db.collection('users').insert({ 
							_id: doc.value.seq, 
							email: user, 
							password: pass, 
							name: name, 
							pic : faker.image.avatar(),
							account_balance: 50,
							is_admin: admin, 
							all_pictures : [] }, function(err, user){
								if(err) { return err }
								if(user != null) {
									console.log('id ' + JSON.stringify(user.ops));
				       				var user = user.ops[0];
			       					var payload = { user };
				       				//payload = { payload }
				       				var token = jwt.sign(payload, config.session_secret);
				       				res.status(200).json({message: "x-access-token: ", token: token});

		       					} //if user

							}) //insert
					
						} // seq call back
					)
				} // else
		
			}); //find one user	
		});
}


function api_token_check(req, res, next){
 console.log('toke' + JSON.stringify(req.headers['x-access-token']));	
 var token = req.body.token || req.query.token || req.headers['x-access-token'];

  // decode jwt token
  if (token) {

    // verifies secret and checks exp
    console.log(config.session_secret);
    jwt.verify(token, config.session_secret, function(err, user) {      
      if (err) {
        return res.json({ success: false, message: 'Failed to authenticate token.' });    
      } else {
        // if everything is good, save to request for use in other routes
        req.user = user; 
        console.log('my user ' + JSON.stringify(req.user));   
        next();
      }
    });

  } else {

    // if there is no token
    // return an error
    return res.status(403).send({ 
        success: false, 
        message: 'No token provided.' 
    });

  }
 }

function random_sentence() {
	var samples = ["This day was {{ adjective }} and {{ adjective }} for {{ noun }}",
				   "The {{ nouns }} {{ adjective }} back! #YOLO",
				   "Today's breakfast, {{ an_adjective }}, {{ adjective }} for {{ noun }} #instafood",
				   "Oldie but goodie! {{ a_noun }} and {{ a_noun }} {{ adjective }} {{ noun }} #TBT",
				   "My {{ noun }} is {{ an_adjective }}, {{ adjective}} and {{ adjective }} which is better than yours #IRL #FOMO ",
				   "That time when your {{ noun }} feels {{ adjective }} and {{ noun }} #FML"
				   ];


	var my_sentence = samples[Math.floor(Math.random() * (4 - 1)) + 1];

	var sentencer = Sentencer.make(my_sentence);
	return sentencer;
}


// routes


// picture related.
app.get('/api/pictures', api_token_check, function(req, res){
	console.log('in pics');
	mongo.connect('mongodb://pixidb:27017/Pixidb', function(err, db){
		db.collection('pictures').find().sort({created_date: -1 }).toArray(function(err, pictures){
			if(pictures) {
				console.log(pictures);
				res.send(pictures);
				
			}
		})
	})

});

app.get('/api/picture/:pictureid', api_token_check, function(req, res){
	console.log('in pics');
	mongo.connect('mongodb://pixidb:27017/Pixidb', function(err, db){
		db.collection('pictures').findOne({ _id : Number(req.params.pictureid) }, function(err, picture){
			if(picture) {
				console.log(picture);
				res.send(picture);
				
			}
		})
	})

});

app.delete('/api/picture/delete', api_token_check, function(req, res) {
	console.log('pic ' + req.query.picture_id);
	if(!req.query.picture_id) {
		res.json('NO PICTURE SPECIFIED TO DELETE');
	}
	else {
		mongo.connect('mongodb://pixidb:27017/Pixidb', function(err, db){
			db.collection('pictures').remove( { _id : Number(req.query.picture_id) },
				function(err, delete_photo){
					if (err) { return err }
						//console.log(delete_photo);
					if (!delete_photo) {
						res.json('Photo not found');
						}
					else {
						res.json('Photo ' +  req.query.picture_id + ' deleted!');
						}		
				})
		})
	}

});

app.get('/api/picture/delete/:picture', function(req, res) {
	console.log('in delete' + req.params.picture);
	if(!req.params.picture) {
		res.json('NO PICTURE SPECIFIED TO DELETE');
	}
	else {
		mongo.connect('mongodb://pixidb:27017/Pixidb', function(err, db){
			db.collection('pictures').remove( { _id : Number(req.params.picture) },
				function(err, delete_photo){
					if (err) { return err }
					if (!delete_photo) {
						res.json('Photo not found');
						}
					else {
						res.json('Photo ' +  req.params.picture + ' deleted!');
						console.log(delete_photo);
						console.log(err);
						}		
				})
		})
	}
});

app.get('/api/picture/:picture_id/likes', api_token_check, function(req, res){
	console.log('pic id ' + req.params.picture_id);
	mongo.connect('mongodb://pixidb:27017/Pixidb', function(err, db){
	db.collection('likes').find({ picture_id : Number(req.params.picture_id)}).toArray(function(err, likes){
		if(err) { return err };

		if(likes) {
			console.log(likes);
			res.json(likes);
			
			}
		})
	})
});


app.get('/api/picture/:picture_id/loves', api_token_check, function(req, res){
	console.log('pic id ' + req.params.picture_id);
	mongo.connect('mongodb://pixidb:27017/Pixidb', function(err, db){
	db.collection('loves').find({ picture_id : Number(req.params.picture_id)}).toArray(function(err, loves){
		if(err) { return err };

		if(loves) {
			console.log(loves);
			res.json(loves);
			
			}
		})
	})
});


app.get('/api/pictures/love', api_token_check, function(req, res){
 console.log(req.query.picture_id);
	if(!req.query.picture_id) {

	 	res.status(202).json('NO PICTURE SPECIFIED TO LOVE PUT ON GET')
	 }
	 else {
 	//db call- if like exists, delete it, if not exists, add it.
 	mongo.connect('mongodb://pixidb:27017/Pixidb', function(err, db){
 		// see if user has money first.
 			console.log(req.user.user.email);
			db.collection('users').findOne( { "email" : req.user.user.email }, function(err, usermoney) {					
					if(err) { return err };
					console.log('account ' + JSON.stringify(usermoney));
					if(usermoney.account_balance >= .05) {  //give money to the photo
						console.log('in create query ' + JSON.stringify(usermoney));
						db.collection('loves').insert({ 
							'user_id': req.user.user._id,
							'picture_id': req.query.picture_id,
							'amount': .05
						}, function(err, new_love) {
							db.collection('pictures')
								.findOneAndUpdate( { _id : Number(req.query.picture_id) }, 
									{ $inc: { money_made :  .05 } },
									function(err, picupdate){
									if(err) { return err }
									else {
										console.log('You gave this photo .05' + JSON.stringify(picupdate));
									}
								})
							console.log(req.user.user._id);
							db.collection('users')
								.findAndModify( { "_id" : req.user.user._id }, 
									[],
									{ "$inc": { "account_balance" :  -.05 } },
									function(err, userupdate){
									if(err) { return err }
									else {
										res.json('You gave this photo .05');
										console.log('update ' + JSON.stringify(userupdate));
									}
							})
						}) //insert
					}
					else if(!usermoney) { //remove old like
						console.log('no money ' + usermoney);
						res.json('You are out of money');

					}
					
				})

			})
 }

});

app.get('/api/pictures/like', api_token_check, function(req, res){
 console.log('in like ' + JSON.stringify(req.user.user));
 if(!req.query.picture_id) {

 	res.status(202).json('NO PICTURE SPECIFIED TO LIKED PUT ON GET')
 }
 else {
 	//db call- if like exists, delete it, if not exists, add it.
 	mongo.connect('mongodb://pixidb:27017/Pixidb', function(err, db){
			db.collection('likes').findOne( { 
				'user_id' : req.user.user._id, 
				'picture_id' : req.query.picture_id }, function(err, like) {
					
					if(err) { return err };
					if(!like) {  //brand new like
						console.log('in create query ' + like);
						db.collection('likes').insert({ 
							'user_id': req.user.user._id,
							'picture_id': req.query.picture_id
						}, function(err, new_like) {
							db.collection('pictures')
								.findOneAndUpdate( { _id : Number(req.query.picture_id) }, 
									{ $inc: { likes :  1 } },
									function(err, picupdate){
										if(err) { return err }
										else {
											console.log('You gave this photo .05' + JSON.stringify(picupdate));
										}
								})
							if(err) { return err }
							else {

								res.json(new_like);
							}
						}) //insert
					}
					else if(like) { //remove old like
						console.log('in delete query ' + like);
						//res.json('already liked');
						db.collection('likes').remove({
							'user_id': req.user.user._id,
							'picture_id': req.query.picture_id
						}, function(err, remove_like){
							db.collection('pictures')
								  .findOneAndUpdate( { _id : Number(req.query.picture_id) }, 
									{ $inc: { likes :  -1} },
									function(err, picupdate){
									if(err) { return err }
									else {
										console.log('You gave this photo .05' + JSON.stringify(picupdate));
									}
								})
							if(err) { return err }
							else {
								res.json('unliked!');
							}
						})
					}
					
				})

			})
 }
});
app.post('/api/picture/upload', api_token_check, upload.single('file'), function(req, res, next){

 	console.log('in upload');
 	if(!req.file) {
 		res.json({message: "error: no file uploaded"});
 	}
 	else {
 		console.log(req.file);
 		console.log(req.file.originalname)
 		var description = random_sentence();
 		mongo.connect('mongodb://pixidb:27017/Pixidb', function(err, db){
 			var name = randomWords({ exactly: 2 });
				name = name.join(' ');
 			db.collection("counters")
				  .findAndModify(
					  	{ "_id": "pictureid" },
					  	[], 
						{ "$inc" : { "seq": 1 } },
					function(err, doc) {
						db.collection('pictures').insert( { 
						'_id'	: doc.value.seq,
						'title' : req.file.originalname, 
						'image_url': req.file.path,
						'name' : name,
						'filename' : req.file.filename,
						'description' : description,
						'creator_id': req.user.user._id,
						'money_made': 0,
						'likes' : 0,
						'created_date': new Date()
						}, function(err, photo){
							if(err){
							console.log('Query error...');
							return err;
							}
							if(photo !== null){
								res.json(photo);
							}
						}) // photo insert
 				}) //sequence call back
 			}) //db
 	
 	} //else

 }); 



// user related.
app.post('/api/user/login', function(req, res){
	if ((!req.body.user) || (!req.body.pass)) {
		res.status(422).json({message: "missing username and or password parameters"});
	}
	else {
	api_authenticate(req.body.user, req.body.pass, req, res);
	}
})

app.post('/api/user/register', function(req, res){
	if ((!req.body.user) || (!req.body.pass)) {
		res.status(422).json({message: "missing username and or password parameters"});
	} else if (req.body.pass.length <= 4) {
		res.status(422).json({ message: "password length too short, minimum of 5 characters"})
	} else {
		console.log('in else');
		api_register(req.body.user, req.body.pass, req, res);
	}
})

app.get('/api/user/info', api_token_check, function(req, res){
	if (!req.user.user._id) {
		res.status(422).json({message: "missing userid"})
	}
	else {
	console.log('user id ' + req.user.user._id);
	mongo.connect('mongodb://pixidb:27017/Pixidb', function(err, db){
		db.collection('users').find( { _id : req.user.user._id }).toArray(function(err, users){
			if (err) { return err }
			if(users) {
				res.status(200).json(users);
			}
		})
	});
	}

});

app.put('/api/user/edit_info', api_token_check, function(req, res){
	console.log('in user put ' + req.user.user._id);

	var objForUpdate = {};
	///console.log('BODY ' + JSON.stringify(req.body));
	if (req.body.email) { objForUpdate.email = req.body.email; }
	if (req.body.password) { objForUpdate.password = req.body.password; }
	if (req.body.name) { objForUpdate.name = req.body.name; }
	if (req.body.is_admin) { objForUpdate.is_admin = true; }
	console.log('length ' + JSON.stringify(objForUpdate));
	if (!req.body.email && !req.body.password && !req.body.name && !req.body.is_admin) {
		res.status(422).json({ "message" : "no data to update, add it to body"});
	}
	else {
	var setObj = { objForUpdate }
	console.log(setObj);

	mongo.connect('mongodb://pixidb:27017/Pixidb', function(err, db){
		db.collection('users').findOneAndUpdate( 
			{ _id : Number(req.user.user._id) }, { $set: objForUpdate },function(err, userupdate){
			if (err) { return err }
			if(userupdate) {
				console.log(userupdate);
				res.status(200).json({"message": "User Successfully Updated"});
			}
		})
	});
	}
});

app.get('/api/other_user_info', api_token_check, function(req, res){
	if (!req.query.user_id) { res.status(202).json({ 'error' : ' missing user_id '});}
	mongo.connect('mongodb://pixidb:27017/Pixidb', function(err, db){
		db.collection('users').find( { _id : Number(req.query.user_id) }).toArray(function(err, user){
			if (err) { return err }
			if(user) {
				console.log(user[0].name);
				var retJson = [{
		            name: user[0].name,
		            pic: user[0].pic
		        }];

		        res.json(retJson);
				
			}
		})
	});

});


app.get('/api/user/pictures', api_token_check, function(req, res){
	mongo.connect('mongodb://pixidb:27017/Pixidb', function(err, db){
	db.collection('pictures').find({ creator_id : req.user.user._id}).toArray(function(err, pictures){
		if(err) { return err };

		if(pictures) {
			console.log(pictures);
			res.json(pictures);
			
			}
		})
	})
});


app.get('/api/user/likes', api_token_check, function(req, res){
	console.log('like id ' + req.user._id);
	mongo.connect('mongodb://pixidb:27017/Pixidb', function(err, db){
	db.collection('likes').find({ user_id : req.user.user._id}).toArray(function(err, likes){
		if(err) { return err };

		if(likes) {
			console.log(likes);
			res.json(likes);
			
			}
		})
	})
});

app.get('/api/user/loves', api_token_check, function(req, res){
	console.log('love id ' + req.user.user._id);
	mongo.connect('mongodb://pixidb:27017/Pixidb', function(err, db){
	db.collection('loves').find({ user_id : req.user.user._id}).toArray(function(err, loves){
		if(err) { return err };

		if(loves) {
			console.log(loves);
			res.json(loves);
			
			}
		})
	})
});






app.get('/about', function(req, res){
	//the file ./about.html does not exist. Will return path to requested file in dev mode.
	res.sendFile('./about.html', {root: __dirname})
});



app.get('/api/admin/all_users', api_token_check, function(req, res){
	//res.json(req.user);

	mongo.connect('mongodb://pixidb:27017/Pixidb', function(err, db){
		db.collection('users').find().toArray(function(err, all_users){
			if (err) { return err }
			if(all_users) {
				res.json(all_users);
			}
		})
	});
});
app.get('/api/admin/total_money', api_token_check, function(req, res){
	mongo.connect('mongodb://pixidb:27017/Pixidb', function(err, db){
		db.collection('loves').find().toArray(function(err, loves){
			if (err) { return err }
			if(loves) {
				var total = loves.length * .05;
				res.json(total);
			}
		})
	});
})




//API ROUTES

app.post('/api/login', function(req, res){
	api_authenticate(req.body.user, req.body.pass, req, res);
})

app.post('/api/register', function(req, res){
	api_register(req.body.user, req.body.pass, req, res);
})


app.get('/about', function(req, res){
	//the file ./about.html does not exist. Will return path to requested file in dev mode.
	res.sendFile('./about.html', {root: __dirname})
});





app.delete('/api/delete_photo', api_token_check, function(req, res) {
	if(!req.query.picture_id) {
		res.json('NO PICTURE SPECIFIED TO DELETE');
	}
	else {
		mongo.connect('mongodb://pixidb:27017/Pixidb', function(err, db){
			db.collection('pictures').remove( { _id : req.query.picture_id },
				function(err, delete_photo){
					if (err) { return err }
					if (!delete_photo) {
						res.json('Photo not found');
						}
					else {
						res.json('Photo ' +  req.query.picture_id + ' deleted!');
						}		
				})
		})
	}

});


app.get('/user_delete_photo/', function(req, res) {
	console.log('in delete' + req.query.picture_id);
	if(!req.query.picture_id) {
		res.json('NO PICTURE SPECIFIED TO DELETE');
	}
	else {
		mongo.connect('mongodb://pixidb:27017/Pixidb', function(err, db){
			db.collection('pictures').remove( { _id : Number(req.query.picture_id) },
				function(err, delete_photo){
					if (err) { return err }
					if (!delete_photo) {
						res.json('Photo not found');
						}
					else {
						res.json('Photo ' +  req.query.picture_id + ' deleted!');
						console.log(delete_photo);
						console.log(err);
						}		
				})
		})
	}
});




//routes
app.get('/', function(req, res){
	res.status(200).json(
			{ message: "Welcome to the Pixi API, use /api/login using x-www-form-coded post data, user : email, pass : password - Make sure when you authenticate on the API you have a header called x-access-token with your token" })
});


app.get('/logout', function(req, res){	
	res.redirect('/login');	
});

app.get('/login', function(req, res){
	res.json({message:  "Welcome to Pixi" });

});

app.get('/register', function(req, res){
	res.json({message:  "Welcome to Pixi" });

})

app.get('/pixi', api_token_check, function(req, res){
	res.sendFile('./pixi.html', {root: __dirname});
})
// csrf prevention - module cs
//use csurf middleware to protect against csurf attacks - does not apply to GET requests unless ignoreMethods option is used 
app.use(csurf({ cookie: true, }));

//set XSRF-TOKEN cookie for each request
app.use(function(req, res, next){
	res.cookie('CSRF-TOKEN', req.csrfToken());
	next();
});

//error handler for csurf middleware
app.use(function (err, req, res, next) {
	if (err.code !== 'EBADCSRFTOKEN') return next(err);
	//handle CSRF token errors here 
	res.status(403).json({ message:  "Request has been tampered with "});
});


