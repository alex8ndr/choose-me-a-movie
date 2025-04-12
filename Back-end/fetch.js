/**
 * Choose Me a Movie
 * JavaScript for handling user preferences and fetching movie recommendations
 */

// Global variables
let options = {};
let pageNumber = 1;

/**
 * Store user preferences in session storage
 */
function language() {
    const selectedLanguage = document.querySelector('input[name="language"]:checked');
    if (selectedLanguage) {
        sessionStorage.pageNumber = 1;
        sessionStorage.setItem("language", selectedLanguage.value);
        console.log("Language selected:", sessionStorage.getItem("language"));
    }
}

function genre() {
    const selectedGenre = document.querySelector('input[name="genre"]:checked');
    if (selectedGenre) {
        sessionStorage.setItem("genre", selectedGenre.value);
        console.log("Genre selected:", sessionStorage.getItem("genre"));
    }
}

function date() {
    const selectedYears = document.querySelector('input[name="date"]:checked');
    if (!selectedYears) return;
    
    const years = selectedYears.value;
    const current = new Date();
    let delta;
    
    // Convert selection to actual year span
    if (years === "1") delta = 1;
    else if (years === "5") delta = 5;
    else if (years === "10") delta = 10;
    else if (years === "20") delta = 20;
    else if (years === "40") delta = 40;
    else if (years === "100") delta = 100;

    const minDate = new Date(current.getFullYear() - delta, current.getMonth(), current.getDate());
    
    // Format date as YYYY-MM-DD
    const formattedDate = minDate.toISOString().split('T')[0];
    sessionStorage.setItem("date", formattedDate);
    
    console.log("Earliest release date:", sessionStorage.getItem("date"));
}

function getStream() {
    const selectedStream = document.querySelector('input[name="stream"]:checked');
    if (selectedStream) {
        sessionStorage.setItem("stream", selectedStream.value);
        console.log("Streaming service selected:", sessionStorage.getItem("stream"));
    }
}
  
function getRating() {
    // Initialize empty array for tracking previously suggested movies
    const empty = [];
    sessionStorage.setItem("previousMovies", JSON.stringify(empty));

    const selectedRating = document.querySelector('input[name="rating"]:checked');
    if (selectedRating) {
        sessionStorage.setItem("rating", selectedRating.value);
        console.log("Minimum rating selected:", sessionStorage.getItem("rating"));
    }
}

/**
 * Map genre ID to readable genre name
 */
function getGenreName(genreId) {
    const genreMap = {
        28: "Action",
        35: "Comedy",
        18: "Drama",
        10749: "Romance",
        9648: "Mystery",
        14: "Fantasy",
        27: "Horror",
        878: "Science Fiction"
    };
    
    return genreMap[genreId] || "Unknown";
}

/**
 * Format movie data for display
 */
function displayMovie(movie) {
    try {
        // Extract movie data
        const title = movie.title;
        const rating = movie.vote_average;
        const releaseDate = movie.release_date;
        const genreId = movie.genre_ids[0];
        let overview = movie.overview;
        
        // Format overview text (limit length)
        if (overview && overview.length > 325) {
            let trimmedOverview = overview.substr(0, 325);
            // End at a complete sentence
            trimmedOverview = trimmedOverview.substr(0, Math.min(trimmedOverview.length, trimmedOverview.lastIndexOf("."))) + ".";
            if (trimmedOverview.length > 50) {
                overview = trimmedOverview;
            }
        }
        
        // Create image element for poster
        const posterPath = movie.poster_path;
        const posterUrl = "https://image.tmdb.org/t/p/w400" + posterPath;
        
        const img = new Image();
        img.onload = function() {
            img.style.maxWidth = "100%";
            img.style.height = "auto";
            img.style.borderRadius = "var(--border-radius)";
            img.style.boxShadow = "var(--shadow)";
            
            const posterContainer = document.getElementById("suggestion1");
            posterContainer.innerHTML = '';
            posterContainer.appendChild(img);
        };
        img.onerror = function() {
            // Handle image loading error
            document.getElementById("suggestion1").innerHTML = '<div class="poster-placeholder">Image not available</div>';
        };
        img.src = posterUrl;
        
        // Update page elements with movie info
        document.getElementById("title").innerText = title;
        document.getElementById("date").innerText = releaseDate;
        document.getElementById("rating").innerText = rating;
        document.getElementById("genre").innerText = getGenreName(parseInt(sessionStorage.getItem("genre"), 10));
        document.getElementById("overview").innerText = overview || "No overview available.";
        
    } catch (err) {
        console.error("Error displaying movie:", err);
        showError("There was a problem displaying the movie. Please try again.");
    }
}

/**
 * Show error message to user
 */
function showError(message) {
    alert(message);
}

/**
 * Build query options and fetch movies
 */
function getChoices() {
    try {
        // Get search parameters from session storage
        options = {};
        options.page = sessionStorage.pageNumber || 1;
        
        // Set language filter and vote count minimum
        if (sessionStorage.getItem('language') === 'en') {
            options["vote_count.gte"] = 300;
        } else {
            options["vote_count.gte"] = 0;
        }
        
        // Set minimum rating
        options["vote_average.gte"] = parseInt(sessionStorage.getItem('rating'), 10);
        
        // Set language
        options.with_original_language = options.language = sessionStorage.getItem('language');
        
        // Set release date range
        options["primary_release_date.gte"] = sessionStorage.getItem('date');
        
        // Set genre
        options.with_genres = parseInt(sessionStorage.getItem('genre'), 10);
        
        // Set streaming service filter
        options.watch_region = "CA";
        options.with_watch_providers = parseInt(sessionStorage.getItem('stream'), 10);
        
        console.log("Search options:", options);
        
        // Call The Movie Database API
        theMovieDb.discover.getMovies(options, successFunction, errorFunction);
    } catch (err) {
        console.error("Error getting movie choices:", err);
        showError("There was a problem fetching movies. Please try again.");
    }
}

/**
 * Handle successful API response
 */
function successFunction(movies) {
    try {
        movies = JSON.parse(movies);
        
        console.log(`Found ${movies.total_results} movies across ${movies.total_pages} pages`);
        
        // If no movies found, show error
        if (movies.total_results === 0) {
            document.location = "./index.html";
            alert("Sorry, no movies found for your criteria! Want to try again?");
            return;
        }
        
        // Choose a random page
        sessionStorage.pageNumber = Math.floor((Math.random() * (movies.total_pages - 1)) + 1);
        
        // Choose a random movie from the results
        const movieCount = Math.min(20, movies.total_results - 1);
        let movieNumber = Math.floor(Math.random() * movieCount);
        
        // Get previously shown movies
        let prevMovies = JSON.parse(sessionStorage.getItem("previousMovies") || "[]");
        
        // Check if we've shown too many movies already
        const maxAttempts = 100;
        let count = 0;
        let title;
        
        // Try to find a movie we haven't shown yet
        do {
            count++;
            if (prevMovies.length > movies.total_results - 1 || count > maxAttempts) {
                document.location = "./index.html";
                alert("Sorry, no more movies found for your criteria! Want to try again?");
                return;
            }
            
            movieNumber = Math.floor(Math.random() * movieCount);
            
            try {
                title = movies.results[movieNumber].title;
            } catch (err) {
                document.location = "./index.html";
                alert("Sorry, no movie found for your criteria! Want to try again?");
                return;
            }
        } while (prevMovies.includes(title));
        
        // Add this movie to previously shown list
        prevMovies.push(title);
        sessionStorage.setItem("previousMovies", JSON.stringify(prevMovies));
        
        // Display the selected movie
        displayMovie(movies.results[movieNumber]);
        
    } catch (err) {
        console.error("Error processing movie results:", err);
        showError("There was a problem processing the results. Please try again.");
    }
}

/**
 * Handle API errors
 */
function errorFunction(error) {
    console.error("API Error:", error);
    showError("There was a problem connecting to the movie database. Please try again later.");
}