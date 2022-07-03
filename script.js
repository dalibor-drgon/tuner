var player = (function () {
    var audioCtx = new(window.AudioContext || window.webkitAudioContext)();
    var oscillator = audioCtx.createOscillator();

    function play(freq) {
        oscillator.type = "sine";
        oscillator.frequency.value = freq;
        oscillator.connect(audioCtx.destination);
        oscillator.start();
    }

    function stop() {
        oscillator.stop();
        oscillator = audioCtx.createOscillator();
    }

    return {
        play,
        stop
    };
})();

var processor = (function() {
    var sample_rate = 48000;
    var is_running = false;
    var buf = new Float32Array(0);
    var cur_freq = 100;
    var prev_intensities = [];
    var promise_function;
    var to_skip = 0;

    function onInit(sample_freq) {
        sample_rate = sample_freq;
    }

    function onData(data) {
        if(to_skip != 0) {
            to_skip --;
            return;
        }
        if (is_running) {
            buf = Float32Array.of(...buf, ...data);
            var sliceLen = 0;
            do {
                sliceLen = process(buf);
                buf = buf.slice(sliceLen);
            } while(sliceLen != 0);
        }
    }

    function calcIntensity(buf, len)
    {
        var cos = 0;
        var sin = 0;
        var angle;
        for(var i = 0; i < len; i++) {
            angle = i / len * Math.PI * 2;
            cos += buf[i] * Math.cos(angle);
            sin += buf[i] * Math.sin(angle);
        }
        return 20 * Math.log10(Math.sqrt(cos * cos + sin * sin) / len);
    }

    function calcMean(intensities) {
        var sum = 0;
        for(var i = 0; i < intensities.length; i++) {
            sum += intensities[i];
        }
        return sum / intensities.length;
    }

    function calcMSE(intensities, mean) {
        var mse = 0;
        for(var i = 0; i < intensities.length; i++) {
            var dif = intensities[i] - mean;
            mse += dif * dif;
        }
        return mse / intensities.length;
    }

    function process(buf)
    {
        var samplesRequired = sample_rate / cur_freq;
        if(buf.length < samplesRequired)
            return 0;

        var intensity = calcIntensity(buf, samplesRequired);
        prev_intensities.push(intensity);
        while(prev_intensities.length > 5)
            prev_intensities.shift();
        if(prev_intensities.length == 5) {
            var mean = calcMean(prev_intensities);
            var mse = calcMSE(prev_intensities, mean);
            console.log(prev_intensities, mean, mse);
            if (mse < 1 && mean > -40) {
                player.stop();
                setRunning(false);
                promise_function(mean);
            }
        }
        return Math.ceil(samplesRequired);
    }

    function setRunning(is_run) {
        to_skip = 5;
        buf = new Float32Array(0);
        is_running = is_run;
    }

    function measure(freq)
    {
        prev_intensities = [];
        cur_freq = freq;
        var promise = new Promise((f) => {
            promise_function = f;
        });
        player.play(freq);
        setRunning(true);
        return promise;
    }

    return {
        buf,
        onInit,
        onData,
        measure
    };
})();

var recorder = function () {

    var audioContext;

    console.log("audio is starting up ...");

    var BUFF_SIZE_RENDERER = 16384;

    var audioInput = null,
    microphone_stream = null,
    gain_node = null,
    script_processor_node = null,
    script_processor_analysis_node = null,
    analyser_node = null;

    if (!navigator.getUserMedia)
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia || navigator.msGetUserMedia;

    if (navigator.getUserMedia){

        navigator.getUserMedia({audio: {noiseSuppression: false, echoCancellation: false}}, 
            function(stream) {
                audioContext = new AudioContext();
                g_stream = stream;
                start_microphone(stream, stream.getAudioTracks()[0].getSettings().sampleRate);
            },
            function(e) {
                alert('Error capturing audio.');
            }
            );

    } else { alert('getUserMedia not supported in this browser.'); }

    // ---

    function process_microphone_buffer(event) {

        var i, N, inp, microphone_output_buffer;

        microphone_output_buffer = event.inputBuffer.getChannelData(0); // just mono - 1 channel for now
    }

    function start_microphone(stream, sampleRate){
        if(!sampleRate) sampleRate = 48000;
        processor.onInit(sampleRate);

        gain_node = audioContext.createGain();
        gain_node.connect( audioContext.destination );

        microphone_stream = audioContext.createMediaStreamSource(stream);
        //microphone_stream.connect(gain_node); 

        script_processor_node = audioContext.createScriptProcessor(BUFF_SIZE_RENDERER, 1, 1);
        script_processor_node.onaudioprocess = process_microphone_buffer;

        microphone_stream.connect(script_processor_node);

        // --- enable volume control for output speakers

        /*
        document.getElementById('volume').addEventListener('change', function() {

            var curr_volume = this.value;
            gain_node.gain.value = curr_volume;

            console.log("curr_volume ", curr_volume);
        });
        */

        // --- setup FFT

        script_processor_analysis_node = audioContext.createScriptProcessor(2048, 1, 1);
        script_processor_analysis_node.connect(gain_node);

        analyser_node = audioContext.createAnalyser();
        analyser_node.smoothingTimeConstant = 0;
        analyser_node.fftSize = 2048;

        microphone_stream.connect(analyser_node);

        analyser_node.connect(script_processor_analysis_node);

        var buffer_length = analyser_node.frequencyBinCount;

        var time_domain = new Float32Array(buffer_length);

        console.log("buffer_length " + buffer_length);

        script_processor_analysis_node.onaudioprocess = function() {

            // get the average for the first channel
            analyser_node.getFloatTimeDomainData(time_domain);

            // draw the spectrogram
            if (microphone_stream.playbackState == microphone_stream.PLAYING_STATE) {
                processor.onData(time_domain);
            }
        };
    }

}();

