
var ui = (function () {

    function safeSplit(value, split) {
        var arr = value.split(split);
        for(var i = 0; i < arr.length; )
        {
            arr[i] = arr[i].trim();
            if(arr[i] == "")
                arr.splice(i, 1);
            else
                i++;
        }
        return arr;
    }

    function readInput(id) {
        return safeSplit(document.getElementById(id).value, "\n");
    }

    function getFrequencies() {
        return readInput("frequencies");
    }

    function appendMeasurements(vals)
    {
        var arr = readInput("results");
        while (arr.length < vals.length)
            arr.push("");
        for(var i = 0; i < vals.length; i++) {
            arr[i] += vals[i] + ",";
        }
        document.getElementById("results").value = arr.join("\n");
    }

    function calculateAverages(arr) {
        var out = [];
        for(var i = 0; i < arr.length; i++) {
            var entry = safeSplit(arr[i], ",");
            var sum = 0;
            for(var j = 0; j < entry.length; j++) {
                sum += Number.parseFloat(entry[j]);
            }
            out.push(sum / entry.length);
        }
        return out;
    }

    function calculateProfile() {
        var freqs = getFrequencies();
        var res = calculateAverages(readInput("results"));
        var ref = calculateAverages(readInput("reference"));
        if (res.length != ref.length || freqs.length != res.length) {
            alert("The number of frequencies inside results must match the number of frequencies inside reference!");
            return;
        }
        var dif = [];
        var max_diff = -100;
        for(var i = 0; i < res.length; i++) {
            var eres = res[i];
            var eref = ref[i];
            var ediff = eref - eres;
            if(ediff > max_diff)
                max_diff = ediff;
            dif.push(ediff);
        }
        for(var i = 0; i < dif.length; i++) {
            dif[i] = freqs[i] + "," + (dif[i] - max_diff).toFixed(1);
        }
        document.getElementById("output").value = dif.join("\n");
    }

    async function measure() {
        var freqs = getFrequencies();
        var out = [];
        var avg_count = 2;
        for(var i = 0; i < freqs.length; i++) {
            var freq = freqs[i];
            var avg = 0;
            for(var retry = 0; retry < avg_count; retry++)
            {
                avg += await processor.measure(freq);
            }
            avg /= avg_count;
            out.push(avg.toFixed(1));
        }
        appendMeasurements(out);
    }
return {
        getFrequencies,
        appendMeasurements,
        measure,
        calculateProfile
    };
})();
