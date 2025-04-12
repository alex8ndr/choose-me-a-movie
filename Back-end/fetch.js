/**
 * Choose Me a Movie
 * JavaScript for handling user preferences and fetching movie recommendations
 */

// Global variables
let options = {};
let pageNumber = 1;
let loadingTimeout;

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
    // Already handled in the HTML with the new checkbox system
    console.log("Streaming services selected:", sessionStorage.getItem("stream"));
}
  
function getRating() {
    // Initialize empty arrays for tracking
    sessionStorage.setItem("previousMovies", JSON.stringify([]));
    sessionStorage.setItem("availableMovies", JSON.stringify([]));

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
 * Show loading state while movie info is being fetched
 */
function showLoading() {
    const posterContainer = document.getElementById("suggestion1");
    const title = document.getElementById("title");
    const date = document.getElementById("date");
    const rating = document.getElementById("rating");
    const overview = document.getElementById("overview");
    
    if (posterContainer) posterContainer.innerHTML = '<div class="loading-spinner"></div>';
    if (title) title.innerText = "Finding the perfect movie...";
    if (date) date.innerText = "-";
    if (rating) rating.innerText = "-";
    if (overview) overview.innerText = "Loading movie information...";
    
    // Set a timeout to show error if loading takes too long
    loadingTimeout = setTimeout(() => {
        showError("Loading is taking longer than expected. Please try again.");
    }, 10000);
}

/**
 * Map provider IDs to their names
 */
const providerMap = {
    8: "Netflix",
    119: "Amazon Prime Video",
    350: "Apple TV+",
    337: "Disney+",
    230: "Crave",
    384: "Max",
    531: "Paramount+"
};

/**
 * Format movie data for display
 */
function displayMovie(movie) {
    try {
        clearTimeout(loadingTimeout);
        
        // Extract movie data
        const title = movie.title;
        const rating = movie.vote_average;
        const releaseDate = movie.release_date;
        const genreId = movie.genre_ids[0];
        let overview = movie.overview;
        
        // Format overview text (limit length)
        if (overview && overview.length > 325) {
            let trimmedOverview = overview.substr(0, 325);
            trimmedOverview = trimmedOverview.substr(0, Math.min(trimmedOverview.length, trimmedOverview.lastIndexOf("."))) + ".";
            if (trimmedOverview.length > 50) {
                overview = trimmedOverview;
            }
        }

        // Create placeholder first
        const posterContainer = document.getElementById("suggestion1");
        posterContainer.innerHTML = '<div class="poster-placeholder">Loading poster...</div>';
        
        // Create image element for poster
        const posterPath = movie.poster_path;
        const posterUrl = "https://image.tmdb.org/t/p/w400" + posterPath;
        
        const img = new Image();
        img.onload = function() {
            img.style.maxWidth = "100%";
            img.style.height = "auto";
            img.style.borderRadius = "var(--border-radius)";
            img.style.boxShadow = "var(--shadow)";
            
            posterContainer.innerHTML = '';
            posterContainer.appendChild(img);
        };
        img.onerror = function() {
            posterContainer.innerHTML = '<div class="poster-placeholder">Image not available</div>';
        };
        
        // Update text content first
        document.getElementById("title").innerText = title;
        document.getElementById("date").innerText = releaseDate;
        document.getElementById("rating").innerText = rating;
        document.getElementById("genre").innerText = getGenreName(parseInt(sessionStorage.getItem("genre"), 10));
        document.getElementById("overview").innerText = overview || "No overview available.";
        
        // Get user's selected streaming services
        const selectedServices = sessionStorage.getItem('stream').split('|').map(id => parseInt(id));
        
        // Fetch streaming providers using the proper endpoint
        theMovieDb.movies.getExternalIds({
            id: movie.id
        }, (externalIdsResponse) => {
            // After getting external IDs, fetch watch providers
            theMovieDb.common.client({
                url: "movie/" + movie.id + "/watch/providers" + theMovieDb.common.generateQuery()
            }, (providerData) => {
                try {
                    const providers = JSON.parse(providerData);
                    if (providers.results && providers.results.CA && providers.results.CA.flatrate) {
                        const streamingServices = providers.results.CA.flatrate;
                        // Filter to only show selected services
                        const availableServices = streamingServices
                            .filter(p => selectedServices.includes(p.provider_id))
                            .map(p => providerMap[p.provider_id] || p.provider_name);
                        
                        if (availableServices.length > 0) {
                            document.getElementById("streaming").innerText = availableServices.join(", ");
                        } else {
                            document.getElementById("streaming").innerText = "Not available on your services";
                        }
                    } else {
                        document.getElementById("streaming").innerText = "Not available on your services";
                    }
                } catch (err) {
                    console.error("Error parsing provider data:", err);
                    document.getElementById("streaming").innerText = "Streaming info unavailable";
                }
            }, (error) => {
                console.error("Error fetching watch providers:", error);
                document.getElementById("streaming").innerText = "Streaming info unavailable";
            });
        }, (error) => {
            console.error("Error fetching external IDs:", error);
            document.getElementById("streaming").innerText = "Streaming info unavailable";
        });
        
        // Load image last
        img.src = posterUrl;
        
    } catch (err) {
        console.error("Error displaying movie:", err);
        showError("There was a problem displaying the movie. Please try again.");
    }
}

/**
 * Show error message to user
 */
function showError(message) {
    // Clear loading state
    clearTimeout(loadingTimeout);
    
    // Only show dialog for actual errors, not just no results
    if (!message.includes("no movies found")) {
        alert(message);
    }
    
    // Update UI to show no results state
    const posterContainer = document.getElementById("suggestion1");
    const title = document.getElementById("title");
    const overview = document.getElementById("overview");
    
    if (posterContainer) posterContainer.innerHTML = '<div class="no-results">No movies found</div>';
    if (title) title.innerText = "No movies found";
    if (overview) overview.innerText = "Try adjusting your criteria to find more movies.";
    
    // Disable the "New Choice" button if there are no more choices
    const newChoiceBtn = document.querySelector('button[onclick="document.location=\'./suggestions.html\'"]');
    if (newChoiceBtn) {
        newChoiceBtn.disabled = true;
        newChoiceBtn.classList.add('btn-disabled');
    }
}

/**
 * Build query options and fetch movies
 */
function getChoices() {
    try {
        showLoading();
        
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
        
        // Set streaming service filter - now with improved handling
        options.watch_region = "CA";
        const streamingServices = sessionStorage.getItem('stream');
        if (streamingServices) {
            options.with_watch_providers = streamingServices;
            // This tells the API to return movies that are on ANY of the selected services
            options.with_watch_monetization_types = "flatrate";
        }
        
        console.log("Search options:", options);
        
        // Call The Movie Database API with a callback to log the raw response
        theMovieDb.discover.getMovies(options, (response) => {
            console.log("Raw API response:", response);
            successFunction(response);
        }, errorFunction);
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
        
        // Store available movies count
        sessionStorage.setItem("availableMovies", movies.total_results);
        
        // If no movies found, show error
        if (movies.total_results === 0) {
            showError("Sorry, no movies found for your criteria! Try adjusting your filters.");
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
            if (prevMovies.length >= movies.total_results || count > maxAttempts) {
                showError("No more movies found for your criteria! Try adjusting your filters.");
                return;
            }
            
            movieNumber = Math.floor(Math.random() * movieCount);
            
            try {
                title = movies.results[movieNumber].title;
            } catch (err) {
                showError("Sorry, no movie found for your criteria! Try adjusting your filters.");
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