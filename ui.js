
var ui = (function () {
    function getFrequencies() {
        var arr = document.getElementById("frequencies").value.split("\n");
        for(var i = 0; i < arr.length; )
        {
            arr[i] = arr[i].trim();
            console.log(i, arr[i]);
            if(arr[i] == "")
                arr.splice(i, 1);
            else
                i++;
        }
        return arr;
    }

    function appendMeasurements(vals)
    {
        var arr = document.getElementById("results").value.split("\n");
        for(var i = 0; i < arr.length; )
        {
            arr[i] = arr[i].trim();
            console.log(i, arr[i]);
            if(arr[i] == "")
                arr.splice(i, 1);
            else
                i++;
        }
        while (arr.length < vals.length)
            arr.push("");
        for(var i = 0; i < vals.length; i++) {
            arr[i] += vals[i] + ",";
        }
        document.getElementById("results").value = arr.join("\n");
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
        measure
    };
})();
