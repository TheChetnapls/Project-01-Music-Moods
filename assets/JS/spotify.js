//grab dom elements
var $albumList = $('#albums');
var $charts = $('#chart_div');
var $searchBTN = $('#search');
var $artistName = $('#artist-search');
var $bodyTitle = $('#body-title')

//spotify token gets used globally in all spotify fetches
let token;

//Used to check if the spotify api access token has expired and gets a new one if it has
function checkToken() {
    //grab last token stored in local storage
    let tokenObject = JSON.parse(localStorage.getItem('spotifyToken'));

    //check if there is a token stored, and if not, get one
    if (tokenObject === null) {
        getToken();
    }
    //spotify tokens expire in an hour, check if token is expired
    else if (!(moment().isBefore(tokenObject.expTime))) {
        getToken();
    }
    //if the token exists and isn't expired, we can use it
    else {
        token = tokenObject.theToken;
    }
}

//gets spotify api access token
function getToken() {
    //client info to get token
    var clientId = 'bd371219340a44e18be1738fb5c6d8f9';
    var clientSecret = 'dae927e96ceb485f816960b8ee664be7';
    //make api call to get spotify access token
    fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        body: 'grant_type=client_credentials',
        headers: {
            'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret),
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
        .then(function (response) {
            return response.json()
        })
        .then(function (data) {
            //grab token from data
            token = data.access_token;
            //create moment when token will expire
            //store expiration time and actual token
            let expireTime = moment().add(3600, 's');
            let tokenThang = {
                theToken: data.access_token,
                expTime: expireTime
            }
            localStorage.setItem('spotifyToken', JSON.stringify(tokenThang));
        });
};

//spotify api call to search arist
function searchArist(name) {
    checkToken();
    //search for artist
    let url = new URL('https://api.spotify.com/v1/search');
    let data = {
        q: name,
        type: 'artist',
        limit: 1
    };
    for (let k in data) {
        url.searchParams.append(k, data[k]);
    };
    fetch(url, {
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    })
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            let ID = data.artists.items[0].id;
            getArtistAlbums(ID)
        });
};

//grab the artists albums
function getArtistAlbums(artistID) {
    checkToken();
    $bodyTitle.text('Albums')
    let url = 'https://api.spotify.com/v1/artists/' + artistID + '/albums';

    fetch(url, {
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    })
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            //store album data into array
            let albumArray = [];
            for (let j = 0; j < data.items.length; j++) {
                albumArray.push({
                    name: data.items[j].name,
                    id: data.items[j].id,
                    pics: data.items[j].images
                });
            };
            renderAlbums(albumArray);
        });
};

//render the albums to the page
function renderAlbums(albums) {
    for (let z = 0; z < albums.length; z++) {

        let $newAlbum = $('<div>', { id: albums[z].id, 'class': 'has-ratio' });
        $newAlbum.text(albums[z].name);

        var $albumArt = $('<img class="image">'); //Equivalent: $(document.createElement('img'))
        $albumArt.attr('src', albums[z].pics[1].url);
        $albumArt.height(albums[z].pics[1].height);
        $albumArt.width(albums[z].pics[1].width);

        $newAlbum.append($albumArt);
        $newAlbum.click(function () {
            getTracksInfo(albums[z].id);
        });
        $albumList.append($newAlbum);
    };
};

//get info on tracks for selected album
function getTracksInfo(albumID) {
    checkToken();
    //create array for tracks data
    let tracksData = new Array;

    //first get tracks from album
    let url = 'https://api.spotify.com/v1/albums/' + albumID + '/tracks';
    fetch(url, {
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    })
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            var nextUrl = 'https://api.spotify.com/v1/audio-features?ids=';
            for (let v = 0; v < data.items.length; v++) {
                tracksData.push({
                    name: data.items[v].name,
                    features: {}
                });
                nextUrl += (data.items[v].id + '%2C');
            };
            //get data for each of the tracks 
            fetch(nextUrl, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            })
                .then(function (response) {
                    return response.json();
                })
                .then(function (data) {
                    for (let x = 0; x < tracksData.length; x++) {
                        tracksData[x].features = data.audio_features[x];
                    }
                })
                .then(function () {
                    renderCharts(tracksData);
                });
        });
};

//render charts with tracks data
function renderCharts(tracks) {
    $albumList.empty();
    $bodyTitle.text('Tracks Data')

    //get feature names
    let featureList = Object.keys(tracks[0].features);
    //console.log('before: ' + featureList);
    //delete unwanted features
    featureList.pop();
    featureList.splice(11, 5);
    //console.log(featureList)

    // Load the Visualization API and the piechart package.
    google.charts.load('current', { 'packages': ['corechart'] });

    // Set a callback to run when the Google Visualization API is loaded.
    google.charts.setOnLoadCallback(drawChart);


    /*
    Callback that creates and populates a data table, 
    instantiates the column charts, passes in the data and draws it.  
     */
    function drawChart() {

        for (let j = 0; j < featureList.length; j++) {
            //create new divs for each chart
            let $newChart = $('<div>', { id: featureList[j], 'class': 'chart' });
            $charts.append($newChart);
            //create and populate data tables
            window[featureList[j] + 'data'] = new google.visualization.DataTable();
            window[featureList[j] + 'data'].addColumn('string', 'Track');
            window[featureList[j] + 'data'].addColumn('number', featureList[j]);
            for (let i = 0; i < tracks.length; i++) {
                window[featureList[j] + 'data'].addRow([
                    tracks[i].name,
                    tracks[i].features[featureList[j]]
                ]);
            };
            // Set chart options
            let options = {
                title: (featureList[j] + ' Data'),
                vAxis: { title: featureList[j] },
                hAxis: { title: 'Track' },
            };
            // Instantiate and draw our chart, passing in some options.
            //draw charts
            let chart = new google.visualization.ColumnChart(document.getElementById(featureList[j]));
            chart.draw(window[featureList[j] + 'data'], options);
        };
    };

};

export function init() {
    //check token and use one in local storage or get a new one
    checkToken();
    //set up event listener for search button
    $searchBTN.click(function () {
        $albumList.empty();
        $charts.empty();
        searchArist($artistName.val());
    });
};
