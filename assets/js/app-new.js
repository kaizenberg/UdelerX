const electron = require('electron');
const remote = electron.remote;
const dialog = remote.dialog;
const BrowserWindow = remote.BrowserWindow;
const fs = require('fs');
const prompt = require('dialogs')(opts = {});
const mkdirp = require('mkdirp');
const homedir = require('os').homedir();
const sanitize = require("sanitize-filename");
const vtt2srt = require('node-vtt-to-srt');
var Downloader = require('mt-files-downloader');
var shell = require('electron').shell;
var https = require('https');
var app = require('http').createServer()
var io = require('socket.io')(app);
var headers;
const $loginAuthenticator = $('.ui.login.authenticator');
var awaitingLogin = false;

app.listen(50490);

electron.ipcRenderer.on('saveDownloads', function () {
  saveDownloads(true);
});

$(document).ajaxError(function (event, request) {
  $(".dimmer").removeClass('active');
});