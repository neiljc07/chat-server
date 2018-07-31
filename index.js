let mysql = require('mysql');
let app = require('express')();
let http = require('http').Server(app);
let io = require('socket.io')(http);

// Connect to mysql
var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  port: 33065,
  database: 'feu'
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});
 
io.on('connection', (socket) => {
  socket.on('get-messages', (params) => {
    var sql = `SELECT a.*, b.name as username, c.uri
              FROM my_class_chat a
              INNER JOIN users b ON
                b.uid = a.user_id
              LEFT JOIN file_managed c ON
                c.fid = b.picture
              WHERE a.section = ?
              ORDER BY a.date DESC
              LIMIT ? OFFSET ?`;

    con.query(sql, [params.section, params.limit, params.offset], function (err, result) {
      if (err) {
        io.emit('error-' + params.user, err);
      } else {
        io.emit('messages-' + params.user, result);
      }
    });
  });

  socket.on('add-message', (message) => {
    var sql = `SELECT a.*, b.uri 
              FROM users a
              LEFT JOIN file_managed b ON
                b.fid = a.picture
              WHERE a.uid = ?`;
    
    con.query(sql, [message.user_id], function(err, result) {
      if (err) {
        err.error = message.index;
        io.emit('error-add-message-' + message.user_id, err);
      } else {
        if(result.length > 0) {
          var user = result[0];
          message.date = new Date();

          sql = `INSERT INTO my_class_chat (user_id, message, date, section)
                VALUES (?, ?, ?, ?)`;

          con.query(sql, [user.uid, message.message, message.date, message.section], function(err, result) {
            if (err) {
              err.error = message.index;
              io.emit('error-add-message-' + message.user_id, err);
            } else {
              message.chat_id = result.insertId;
              message.uri = user.uri;
              io.emit('message-' + message.section, message);
            }
          });
        } else {
          io.emit('error-add-message-' + message.user_id, {
            error : message.index,
            message : 'User Not Found'
          });
        }
      }
    });
  });

  // socket.on('disconnect', function() {
  //   io.emit('users-changed', {user: socket.nickname, event: 'left'});   
  // });
 
  // socket.on('set-nickname', (nickname) => {
  //   socket.nickname = nickname;
  //   io.emit('users-changed', {user: nickname, event: 'joined'});    
  // });
  
  // socket.on('add-message', (message) => {
  //   io.emit('message', {text: message.text, from: socket.nickname, created: new Date()});    
  // });
});
 
var port = process.env.PORT || 3001;
 
http.listen(port, function(){
  console.log('listening in http://localhost:' + port);
});