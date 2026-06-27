// Runtime config — loaded before the game scripts.
// On GitHub Pages (static, no backend) leave this empty: the game runs fully
// offline with localStorage saves. If you host the backend (server.py) somewhere
// public, put its URL here to light up accounts / cloud saves / leaderboard / clans
// across the internet, e.g.:
//   window.VW_API_BASE = "https://villagewar-api.yourdomain.com";
window.VW_API_BASE = "";

// ---- Password gate ----------------------------------------------------------
// Anyone can open the website, but the game stays locked until the correct
// password is entered. Only the password's SHA-256 hash is stored here, never
// the password itself.
//
// To change the password: run in any browser console (or terminal) ...
//   crypto.subtle.digest('SHA-256', new TextEncoder().encode('YOUR PASSWORD'))
//     .then(b => console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))
//   # or:  printf 'YOUR PASSWORD' | shasum -a 256
// ... and paste the resulting hash below.
window.VW_GATE = {
    enabled: true,
    // default password is:  villagewar   (change it!)
    hash: "10fb4c9ee60d97914350ab603dc3f6ddb1fbdfb9fd3adff8aca46893f8569783",
    remember: true   // remember unlock on this device so it's not asked every visit
};
