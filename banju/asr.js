/* 免手圈子 · 离线听写
 *
 * 拆自 huggingface/transformers.js（Apache-2.0，见 vendor/LICENSE-transformers.js.txt）。
 * 只用它两件事：把 WebAudio 采到的声音喂给 Whisper，把声音变成字。
 * 模型第一次用才下载，之后由浏览器缓存；音频不上传，只在内存里过一遍。
 */
(function () {
  'use strict';

  var PIPE = null;
  var MODEL = 'Xenova/whisper-tiny';   // 约 40MB，第一次用时下载
  var STATE = { busy: false, stop: false };

  function load(onState) {
    if (PIPE) return PIPE;
    onState && onState('第一次用，要下载听写模型（约 40MB），只下一次。');
    PIPE = import('./vendor/transformers.web.min.js').then(function (T) {
      T.env.allowLocalModels = false;
      try {
        T.env.backends.onnx.wasm.numThreads = 1;
      } catch (e) {}
      return T.pipeline('automatic-speech-recognition', MODEL, {
        dtype: 'q8',
        device: 'wasm'
      });
    });
    return PIPE;
  }

  function resample(data, from, to) {
    if (from === to) return data;
    var ratio = from / to;
    var len = Math.round(data.length / ratio);
    var out = new Float32Array(len);
    for (var i = 0; i < len; i++) {
      var pos = i * ratio;
      var i0 = Math.floor(pos);
      var f = pos - i0;
      var a = data[i0] || 0;
      var b = data[i0 + 1] || 0;
      out[i] = a * (1 - f) + b * f;
    }
    return out;
  }

  // 一直听着，等到有声音、然后安静下来，就把这一句切出来
  function capture(opts) {
    return new Promise(function (resolve, reject) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC || !navigator.mediaDevices) { reject(new Error('no-audio-api')); return; }

      navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      }).then(function (stream) {
        var ac = new AC();
        var src = ac.createMediaStreamSource(stream);
        var sp = ac.createScriptProcessor(4096, 1, 1);
        var silentGain = ac.createGain();
        silentGain.gain.value = 0;

        var chunks = [];
        var started = false;
        var lastVoice = Date.now();
        var began = Date.now();
        var closed = false;

        function finish() {
          if (closed) return;
          closed = true;
          try { sp.disconnect(); src.disconnect(); silentGain.disconnect(); } catch (e) {}
          try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
          try { ac.close(); } catch (e) {}

          var total = 0, i;
          for (i = 0; i < chunks.length; i++) total += chunks[i].length;
          var all = new Float32Array(total);
          var off = 0;
          for (i = 0; i < chunks.length; i++) { all.set(chunks[i], off); off += chunks[i].length; }
          if (!started || all.length < ac.sampleRate * 0.25) {
            reject(new Error('no-speech'));
            return;
          }
          resolve(resample(all, ac.sampleRate, 16000));
        }

        sp.onaudioprocess = function (e) {
          var d = e.inputBuffer.getChannelData(0);
          var sum = 0;
          for (var i = 0; i < d.length; i++) sum += d[i] * d[i];
          var rms = Math.sqrt(sum / d.length);
          if (rms > 0.018) {
            started = true;
            lastVoice = Date.now();
          }
          if (started) chunks.push(new Float32Array(d));
        };

        src.connect(sp);
        sp.connect(silentGain);
        silentGain.connect(ac.destination);

        var timer = setInterval(function () {
          var now = Date.now();
          if (started && now - lastVoice > 1100) { clearInterval(timer); finish(); }
          if (now - began > 30000) { clearInterval(timer); finish(); }
          if (STATE.stop) { clearInterval(timer); finish(); }
          opts && opts.onLevel && opts.onLevel(started);
        }, 120);
      }).catch(reject);
    });
  }

  // 说一句 → 得到一行字
  function listen(onState, onLevel) {
    STATE.stop = false;
    var started = Date.now();
    return capture({ onLevel: onLevel }).then(function (audio) {
      return load(onState).then(function (pipe) {
        onState && onState('正在把声音变成字…');
        return pipe(audio, { language: 'zh', task: 'transcribe' }).then(function (out) {
          var text = (out && out.text ? out.text : '').trim();
          if (!text) throw new Error('empty');
          return { text: text, ms: Date.now() - started };
        });
      });
    });
  }

  window.BanjuASR = {
    supported: !!(navigator.mediaDevices && (window.AudioContext || window.webkitAudioContext)),
    listen: listen,
    stop: function () { STATE.stop = true; }
  };
})();
