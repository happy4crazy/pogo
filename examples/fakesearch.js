'use strict';

const pogo = require("../index.js"),
      race = pogo.race,
      chan = pogo.chan,
      put = pogo.put;

const sleep = ms => new Promise((yep, nope) => setTimeout(yep, ms));

function fakeSearch(kind) {
  return function*(query) {
    yield sleep(Math.random() * 200);
    return kind  + " result for query " + query;
  };
}

var web1 = fakeSearch("web1");
var web2 = fakeSearch("web2");
var image1 = fakeSearch("image1");
var image2 = fakeSearch("image2");
var video1 = fakeSearch("video1");
var video2 = fakeSearch("video2");

function* first(query, replicas) {
  const ch = chan();
  function* searchReplica(i) {
    yield put(ch, (yield* replicas[i](query)));
  }
  for (var i = 0; i < replicas.length; i++) {
    pogo(searchReplica, [i]).catch(e => console.log("wtf", e));
  }
  return (yield ch);
}

function* google(query) {
  var ch = chan();

  pogo(function*() {
    yield put(ch, (yield* first(query, [web1, web2])));
  }).catch(e => console.log("wtf", e));
  pogo(function*() {
    yield put(ch, (yield* first(query, [image1, image2])));
  }).catch(e => console.log("wtf", e));
  pogo(function*() {
    yield put(ch, (yield* first(query, [video1, video2])));
  }).catch(e => console.log("wtf", e));

  var t = sleep(80);

  var results = [];
  for (var i = 0; i < 3; i++) {
    var r = yield race([ch, t.then(() => "zzz")]);
    if (r.channel) {
      results.push(r.value);
    } else {
      console.log("timed out");
      break;
    }
  }

  return results;
}

pogo(function*() {
  var start = new Date();
  var results = yield* google("PLT");
  var elapsed = new Date() - start;
  console.log(results.join("\n"));
  console.log(elapsed);
}).catch(e => console.log("wtf", e));
