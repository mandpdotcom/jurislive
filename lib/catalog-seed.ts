// Curated catalog slice for the demo.
//
// The real Discogs monthly dump (data.discogs.com, CC0) is tens of GB / 15M+ releases —
// far too large to ship or parse during a live demo. Per the concept doc, the demo instead
// uses a curated slice of real, recognizable releases with canonical metadata and
// *generated plausible* market prices. The schema matches what `scripts/etl-discogs.ts`
// produces from the real dump, so swapping this seed for the full ETL is a drop-in change.
//
// Cover art is rendered as a generated "sleeve" gradient in the UI (the dumps don't include
// images); prices here are plausible ranges, not harvested marketplace data.

import type { Track } from "./types"

type SeedPressing = {
  year: number
  country: string
  label: string
  catno: string
  format: string
  /** rough "what a clean copy goes for" anchor in USD; the low/median/high spread is derived from it */
  price: number
}

type SeedMaster = {
  title: string
  artist: string
  year: number
  genre: string
  style: string
  tracks: [string, string, string][] // [position, title, duration]
  pressings: SeedPressing[]
}

const t = (...rows: [string, string, string][]): [string, string, string][] => rows

export const CATALOG: SeedMaster[] = [
  {
    title: "Kind of Blue",
    artist: "Miles Davis",
    year: 1959,
    genre: "Jazz",
    style: "Modal",
    tracks: t(
      ["A1", "So What", "9:22"],
      ["A2", "Freddie Freeloader", "9:46"],
      ["A3", "Blue in Green", "5:37"],
      ["B1", "All Blues", "11:33"],
      ["B2", "Flamenco Sketches", "9:26"],
    ),
    pressings: [
      { year: 1959, country: "US", label: "Columbia", catno: "CL 1355", format: '12", Mono, LP', price: 320 },
      { year: 1997, country: "US", label: "Classic Records", catno: "CS 8163", format: '12", 180g, Reissue', price: 65 },
      { year: 2015, country: "Europe", label: "Sony Music", catno: "88875111621", format: '12", 180g, Reissue', price: 24 },
    ],
  },
  {
    title: "A Love Supreme",
    artist: "John Coltrane",
    year: 1965,
    genre: "Jazz",
    style: "Free Jazz, Modal",
    tracks: t(
      ["A1", "Part I: Acknowledgement", "7:43"],
      ["A2", "Part II: Resolution", "7:20"],
      ["B1", "Part III: Pursuance", "10:42"],
      ["B2", "Part IV: Psalm", "7:05"],
    ),
    pressings: [
      { year: 1965, country: "US", label: "Impulse!", catno: "A-77", format: '12", Mono, LP', price: 280 },
      { year: 2008, country: "US", label: "Impulse!", catno: "B0011066-01", format: '12", 180g, Reissue', price: 38 },
    ],
  },
  {
    title: "Rumours",
    artist: "Fleetwood Mac",
    year: 1977,
    genre: "Rock",
    style: "Soft Rock, Pop Rock",
    tracks: t(
      ["A1", "Second Hand News", "2:43"],
      ["A2", "Dreams", "4:14"],
      ["A3", "Never Going Back Again", "2:02"],
      ["A4", "Don't Stop", "3:11"],
      ["B1", "The Chain", "4:28"],
      ["B2", "Gold Dust Woman", "4:51"],
    ),
    pressings: [
      { year: 1977, country: "US", label: "Warner Bros. Records", catno: "BSK 3010", format: '12", LP, Album', price: 45 },
      { year: 1977, country: "UK", label: "Warner Bros. Records", catno: "K 56344", format: '12", LP, Album', price: 38 },
      { year: 2011, country: "Europe", label: "Warner Bros. Records", catno: "759934519-1", format: '12", 180g, Reissue', price: 28 },
    ],
  },
  {
    title: "The Dark Side of the Moon",
    artist: "Pink Floyd",
    year: 1973,
    genre: "Rock",
    style: "Prog Rock, Psychedelic Rock",
    tracks: t(
      ["A1", "Speak to Me / Breathe", "3:58"],
      ["A2", "On the Run", "3:30"],
      ["A3", "Time", "6:53"],
      ["A4", "The Great Gig in the Sky", "4:36"],
      ["B1", "Money", "6:22"],
      ["B2", "Us and Them", "7:49"],
    ),
    pressings: [
      { year: 1973, country: "UK", label: "Harvest", catno: "SHVL 804", format: '12", LP, Album, Solid Blue Triangle', price: 140 },
      { year: 1973, country: "US", label: "Harvest", catno: "SMAS-11163", format: '12", LP, Album', price: 60 },
      { year: 2016, country: "Europe", label: "Pink Floyd Records", catno: "PFRLP8", format: '12", 180g, Remastered', price: 30 },
    ],
  },
  {
    title: "Led Zeppelin IV",
    artist: "Led Zeppelin",
    year: 1971,
    genre: "Rock",
    style: "Hard Rock, Blues Rock",
    tracks: t(
      ["A1", "Black Dog", "4:55"],
      ["A2", "Rock and Roll", "3:40"],
      ["A4", "Stairway to Heaven", "8:03"],
      ["B1", "Misty Mountain Hop", "4:39"],
      ["B3", "When the Levee Breaks", "7:08"],
    ),
    pressings: [
      { year: 1971, country: "UK", label: "Atlantic", catno: "2401 012", format: '12", LP, Album', price: 90 },
      { year: 2014, country: "Europe", label: "Atlantic", catno: "8122796419", format: '12", 180g, Remastered', price: 30 },
    ],
  },
  {
    title: "OK Computer",
    artist: "Radiohead",
    year: 1997,
    genre: "Rock",
    style: "Alternative Rock, Art Rock",
    tracks: t(
      ["A1", "Airbag", "4:44"],
      ["A2", "Paranoid Android", "6:23"],
      ["A3", "Subterranean Homesick Alien", "4:27"],
      ["B1", "Exit Music (For a Film)", "4:24"],
      ["C1", "Karma Police", "4:21"],
      ["D2", "No Surprises", "3:48"],
    ),
    pressings: [
      { year: 1997, country: "UK", label: "Parlophone", catno: "NODATA 02", format: '2x12", LP, Album', price: 110 },
      { year: 2017, country: "Europe", label: "XL Recordings", catno: "XLLP790", format: '2x12", 180g, Reissue', price: 35 },
    ],
  },
  {
    title: "Nevermind",
    artist: "Nirvana",
    year: 1991,
    genre: "Rock",
    style: "Grunge, Alternative Rock",
    tracks: t(
      ["A1", "Smells Like Teen Spirit", "5:01"],
      ["A2", "In Bloom", "4:14"],
      ["A3", "Come as You Are", "3:39"],
      ["A5", "Lithium", "4:17"],
      ["B4", "On a Plain", "3:16"],
    ),
    pressings: [
      { year: 1991, country: "US", label: "DGC", catno: "DGC-24425", format: '12", LP, Album', price: 130 },
      { year: 2011, country: "US", label: "DGC", catno: "B0015885-01", format: '12", 180g, Reissue', price: 28 },
    ],
  },
  {
    title: "The Velvet Underground & Nico",
    artist: "The Velvet Underground",
    year: 1967,
    genre: "Rock",
    style: "Art Rock, Experimental",
    tracks: t(
      ["A1", "Sunday Morning", "2:54"],
      ["A2", "I'm Waiting for the Man", "4:39"],
      ["A3", "Femme Fatale", "2:38"],
      ["B2", "Heroin", "7:12"],
      ["B5", "European Son", "7:46"],
    ),
    pressings: [
      { year: 1967, country: "US", label: "Verve Records", catno: "V6-5008", format: '12", LP, Album, Peelable Banana', price: 600 },
      { year: 2012, country: "Europe", label: "Polydor", catno: "5354731", format: '12", 180g, Reissue', price: 32 },
    ],
  },
  {
    title: "Abbey Road",
    artist: "The Beatles",
    year: 1969,
    genre: "Rock",
    style: "Pop Rock, Psychedelic",
    tracks: t(
      ["A1", "Come Together", "4:20"],
      ["A2", "Something", "3:03"],
      ["A4", "Oh! Darling", "3:26"],
      ["B1", "Here Comes the Sun", "3:05"],
      ["B6", "Golden Slumbers", "1:31"],
    ),
    pressings: [
      { year: 1969, country: "UK", label: "Apple Records", catno: "PCS 7088", format: '12", LP, Album', price: 120 },
      { year: 2012, country: "Europe", label: "Apple Records", catno: "PCS 7088", format: '12", 180g, Remastered', price: 34 },
    ],
  },
  {
    title: "What's Going On",
    artist: "Marvin Gaye",
    year: 1971,
    genre: "Funk / Soul",
    style: "Soul",
    tracks: t(
      ["A1", "What's Going On", "3:53"],
      ["A2", "What's Happening Brother", "2:43"],
      ["A4", "Save the Children", "4:03"],
      ["B1", "Mercy Mercy Me (The Ecology)", "3:16"],
      ["B2", "Right On", "7:31"],
    ),
    pressings: [
      { year: 1971, country: "US", label: "Tamla", catno: "TS 310", format: '12", LP, Album', price: 75 },
      { year: 2016, country: "US", label: "Motown", catno: "B0024500-01", format: '12", 180g, Reissue', price: 26 },
    ],
  },
  {
    title: "Songs in the Key of Life",
    artist: "Stevie Wonder",
    year: 1976,
    genre: "Funk / Soul",
    style: "Soul, Funk",
    tracks: t(
      ["A1", "Love's in Need of Love Today", "7:06"],
      ["A3", "Sir Duke", "3:52"],
      ["A4", "I Wish", "4:12"],
      ["C2", "Isn't She Lovely", "6:34"],
      ["D3", "As", "7:08"],
    ),
    pressings: [
      { year: 1976, country: "US", label: "Tamla", catno: "T13-340C2", format: '2x12", LP, Album + 7"', price: 55 },
      { year: 2016, country: "Europe", label: "Motown", catno: "5353656", format: '2x12", 180g, Reissue', price: 36 },
    ],
  },
  {
    title: "Innervisions",
    artist: "Stevie Wonder",
    year: 1973,
    genre: "Funk / Soul",
    style: "Soul, Funk",
    tracks: t(
      ["A1", "Too High", "4:36"],
      ["A3", "Living for the City", "7:22"],
      ["A4", "Golden Lady", "4:40"],
      ["B2", "Higher Ground", "3:42"],
      ["B5", "He's Misstra Know-It-All", "5:36"],
    ),
    pressings: [
      { year: 1973, country: "US", label: "Tamla", catno: "T 326L", format: '12", LP, Album', price: 48 },
    ],
  },
  {
    title: "Illmatic",
    artist: "Nas",
    year: 1994,
    genre: "Hip Hop",
    style: "Boom Bap, East Coast",
    tracks: t(
      ["A1", "The Genesis", "1:46"],
      ["A2", "N.Y. State of Mind", "4:54"],
      ["A4", "The World Is Yours", "4:50"],
      ["B2", "One Love", "5:25"],
      ["B4", "It Ain't Hard to Tell", "3:21"],
    ),
    pressings: [
      { year: 1994, country: "US", label: "Columbia", catno: "C 57684", format: '12", LP, Album', price: 160 },
      { year: 2014, country: "US", label: "Columbia", catno: "88843090961", format: '12", 180g, Reissue', price: 30 },
    ],
  },
  {
    title: "Ready to Die",
    artist: "The Notorious B.I.G.",
    year: 1994,
    genre: "Hip Hop",
    style: "East Coast, Boom Bap",
    tracks: t(
      ["A2", "Things Done Changed", "3:58"],
      ["A3", "Gimme the Loot", "5:02"],
      ["B1", "Juicy", "5:02"],
      ["C2", "Big Poppa", "4:11"],
      ["D1", "One More Chance", "3:57"],
    ),
    pressings: [
      { year: 1994, country: "US", label: "Bad Boy Records", catno: "73000-1", format: '2x12", LP, Album', price: 120 },
      { year: 2019, country: "US", label: "Bad Boy Records", catno: "603497850983", format: '2x12", Reissue', price: 32 },
    ],
  },
  {
    title: "Midnight Marauders",
    artist: "A Tribe Called Quest",
    year: 1993,
    genre: "Hip Hop",
    style: "Jazzy Hip-Hop",
    tracks: t(
      ["A2", "Award Tour", "3:43"],
      ["A4", "Sucka Nigga", "4:09"],
      ["B2", "Electric Relaxation", "4:01"],
      ["B5", "Oh My God", "3:26"],
      ["C1", "We Can Get Down", "4:24"],
    ),
    pressings: [
      { year: 1993, country: "US", label: "Jive", catno: "01241-41490-1", format: '12", LP, Album', price: 70 },
    ],
  },
  {
    title: "Discovery",
    artist: "Daft Punk",
    year: 2001,
    genre: "Electronic",
    style: "House, French House",
    tracks: t(
      ["A1", "One More Time", "5:20"],
      ["A2", "Aerodynamic", "3:27"],
      ["B1", "Digital Love", "4:58"],
      ["B2", "Harder, Better, Faster, Stronger", "3:45"],
      ["D2", "Face to Face", "3:58"],
    ),
    pressings: [
      { year: 2001, country: "Europe", label: "Virgin", catno: "7243 8 49606 1 1", format: '2x12", LP, Album', price: 95 },
      { year: 2014, country: "Europe", label: "Daft Life", catno: "9362-49606-1", format: '2x12", 180g, Reissue', price: 40 },
    ],
  },
  {
    title: "Selected Ambient Works 85-92",
    artist: "Aphex Twin",
    year: 1992,
    genre: "Electronic",
    style: "Ambient, IDM",
    tracks: t(
      ["A1", "Xtal", "4:51"],
      ["A2", "Tha", "9:01"],
      ["B1", "Ageispolis", "5:21"],
      ["C2", "Pulsewidth", "3:47"],
      ["D1", "Actium", "7:31"],
    ),
    pressings: [
      { year: 1992, country: "UK", label: "Apollo", catno: "AMB 3922", format: '2x12", LP, Album', price: 150 },
      { year: 2015, country: "UK", label: "Apollo", catno: "AMB3922RP", format: '2x12", Reissue', price: 34 },
    ],
  },
  {
    title: "Untrue",
    artist: "Burial",
    year: 2007,
    genre: "Electronic",
    style: "Dubstep, UK Garage",
    tracks: t(
      ["A1", "Untitled", "0:46"],
      ["A2", "Archangel", "3:58"],
      ["B1", "Near Dark", "3:56"],
      ["C2", "Etched Headplate", "5:08"],
      ["D1", "Raver", "4:32"],
    ),
    pressings: [
      { year: 2007, country: "UK", label: "Hyperdub", catno: "HDBLP002", format: '2x12", LP, Album', price: 55 },
    ],
  },
  {
    title: "Remain in Light",
    artist: "Talking Heads",
    year: 1980,
    genre: "Rock",
    style: "New Wave, Art Rock",
    tracks: t(
      ["A1", "Born Under Punches", "5:46"],
      ["A2", "Crosseyed and Painless", "4:45"],
      ["A3", "The Great Curve", "6:26"],
      ["B1", "Once in a Lifetime", "4:19"],
      ["B3", "Listening Wind", "5:30"],
    ),
    pressings: [
      { year: 1980, country: "US", label: "Sire", catno: "SRK 6095", format: '12", LP, Album', price: 42 },
    ],
  },
  {
    title: "Blue Lines",
    artist: "Massive Attack",
    year: 1991,
    genre: "Electronic",
    style: "Trip Hop, Downtempo",
    tracks: t(
      ["A1", "Safe from Harm", "5:18"],
      ["A3", "Blue Lines", "4:21"],
      ["B1", "Unfinished Sympathy", "5:08"],
      ["B3", "Lately", "4:26"],
      ["B4", "Hymn of the Big Wheel", "6:36"],
    ),
    pressings: [
      { year: 1991, country: "UK", label: "Wild Bunch Records", catno: "WBRLP 1", format: '12", LP, Album', price: 60 },
    ],
  },
  {
    title: "Legend",
    artist: "Bob Marley & The Wailers",
    year: 1984,
    genre: "Reggae",
    style: "Roots Reggae",
    tracks: t(
      ["A1", "Is This Love", "3:52"],
      ["A3", "Could You Be Loved", "3:57"],
      ["A5", "Buffalo Soldier", "4:18"],
      ["B2", "Get Up, Stand Up", "3:17"],
      ["B5", "Redemption Song", "3:48"],
    ),
    pressings: [
      { year: 1984, country: "UK", label: "Island Records", catno: "BMW 1", format: '12", LP, Compilation', price: 40 },
      { year: 2015, country: "Europe", label: "Tuff Gong", catno: "00600753030534", format: '12", 180g, Reissue', price: 25 },
    ],
  },
  {
    title: "Catch a Fire",
    artist: "The Wailers",
    year: 1973,
    genre: "Reggae",
    style: "Roots Reggae",
    tracks: t(
      ["A1", "Concrete Jungle", "4:13"],
      ["A3", "Stop That Train", "3:54"],
      ["B1", "Stir It Up", "5:32"],
      ["B4", "Midnight Ravers", "5:08"],
    ),
    pressings: [
      { year: 1973, country: "UK", label: "Island Records", catno: "ILPS 9241", format: '12", LP, Album', price: 130 },
    ],
  },
  {
    title: "Horses",
    artist: "Patti Smith",
    year: 1975,
    genre: "Rock",
    style: "Punk, Art Rock",
    tracks: t(
      ["A1", "Gloria", "5:57"],
      ["A2", "Redondo Beach", "3:26"],
      ["A4", "Free Money", "3:52"],
      ["B1", "Kimberly", "4:27"],
      ["B3", "Land", "9:25"],
    ),
    pressings: [
      { year: 1975, country: "US", label: "Arista", catno: "AL 4066", format: '12", LP, Album', price: 50 },
    ],
  },
  {
    title: "London Calling",
    artist: "The Clash",
    year: 1979,
    genre: "Rock",
    style: "Punk, Reggae",
    tracks: t(
      ["A1", "London Calling", "3:19"],
      ["A4", "Rudie Can't Fail", "3:29"],
      ["C2", "The Guns of Brixton", "3:12"],
      ["D5", "Train in Vain", "3:09"],
    ),
    pressings: [
      { year: 1979, country: "UK", label: "CBS", catno: "CLASH 3", format: '2x12", LP, Album', price: 65 },
      { year: 2015, country: "Europe", label: "Sony Music", catno: "88875135831", format: '2x12", 180g, Reissue', price: 30 },
    ],
  },
  {
    title: "Paranoid",
    artist: "Black Sabbath",
    year: 1970,
    genre: "Rock",
    style: "Heavy Metal, Hard Rock",
    tracks: t(
      ["A1", "War Pigs", "7:57"],
      ["A2", "Paranoid", "2:48"],
      ["A3", "Planet Caravan", "4:32"],
      ["A4", "Iron Man", "5:56"],
      ["B4", "Fairies Wear Boots", "6:14"],
    ),
    pressings: [
      { year: 1970, country: "UK", label: "Vertigo", catno: "6360 011", format: '12", LP, Album, Swirl', price: 220 },
      { year: 2012, country: "Europe", label: "Sanctuary", catno: "BMGRM046LP", format: '12", 180g, Reissue', price: 27 },
    ],
  },
  {
    title: "Master of Puppets",
    artist: "Metallica",
    year: 1986,
    genre: "Rock",
    style: "Thrash Metal",
    tracks: t(
      ["A1", "Battery", "5:13"],
      ["A2", "Master of Puppets", "8:36"],
      ["B1", "Disposable Heroes", "8:17"],
      ["B3", "Orion", "8:27"],
    ),
    pressings: [
      { year: 1986, country: "US", label: "Elektra", catno: "60439-1", format: '12", LP, Album', price: 80 },
      { year: 2017, country: "Europe", label: "Blackened", catno: "BLCKND005-1", format: '12", 180g, Reissue', price: 28 },
    ],
  },
  {
    title: "Pet Sounds",
    artist: "The Beach Boys",
    year: 1966,
    genre: "Rock",
    style: "Pop Rock, Baroque Pop",
    tracks: t(
      ["A1", "Wouldn't It Be Nice", "2:33"],
      ["A3", "That's Not Me", "2:30"],
      ["A5", "God Only Knows", "2:51"],
      ["B2", "I Just Wasn't Made for These Times", "3:12"],
      ["B6", "Caroline, No", "2:51"],
    ),
    pressings: [
      { year: 1966, country: "US", label: "Capitol Records", catno: "T 2458", format: '12", Mono, LP', price: 90 },
    ],
  },
  {
    title: "Blue",
    artist: "Joni Mitchell",
    year: 1971,
    genre: "Rock",
    style: "Folk Rock, Singer-Songwriter",
    tracks: t(
      ["A1", "All I Want", "3:34"],
      ["A3", "A Case of You", "4:21"],
      ["A4", "Carey", "3:01"],
      ["B2", "California", "3:51"],
      ["B5", "The Last Time I Saw Richard", "4:14"],
    ),
    pressings: [
      { year: 1971, country: "US", label: "Reprise Records", catno: "MS 2038", format: '12", LP, Album', price: 55 },
    ],
  },
  {
    title: "Maggot Brain",
    artist: "Funkadelic",
    year: 1971,
    genre: "Funk / Soul",
    style: "Funk, Psychedelic",
    tracks: t(
      ["A1", "Maggot Brain", "10:21"],
      ["B1", "Can You Get to That", "2:50"],
      ["B3", "Super Stupid", "3:59"],
      ["B5", "Wars of Armageddon", "9:42"],
    ),
    pressings: [
      { year: 1971, country: "US", label: "Westbound Records", catno: "WB 2007", format: '12", LP, Album', price: 110 },
    ],
  },
  {
    title: "Bitches Brew",
    artist: "Miles Davis",
    year: 1970,
    genre: "Jazz",
    style: "Fusion, Jazz-Rock",
    tracks: t(
      ["A1", "Pharaoh's Dance", "20:05"],
      ["B1", "Bitches Brew", "26:58"],
      ["C2", "Spanish Key", "17:32"],
      ["D2", "Sanctuary", "10:56"],
    ),
    pressings: [
      { year: 1970, country: "US", label: "Columbia", catno: "GP 26", format: '2x12", LP, Album', price: 70 },
    ],
  },
  {
    title: "The Low End Theory",
    artist: "A Tribe Called Quest",
    year: 1991,
    genre: "Hip Hop",
    style: "Jazzy Hip-Hop",
    tracks: t(
      ["A1", "Excursions", "3:53"],
      ["A4", "Buggin' Out", "3:38"],
      ["B2", "Jazz (We've Got)", "4:09"],
      ["B5", "Check the Rhime", "3:37"],
      ["C3", "Scenario", "4:10"],
    ),
    pressings: [
      { year: 1991, country: "US", label: "Jive", catno: "1418-1-J", format: '12", LP, Album', price: 85 },
    ],
  },
  {
    title: "Channel Orange",
    artist: "Frank Ocean",
    year: 2012,
    genre: "Funk / Soul",
    style: "Contemporary R&B, Neo Soul",
    tracks: t(
      ["A2", "Thinkin Bout You", "3:20"],
      ["B2", "Sweet Life", "4:24"],
      ["C1", "Super Rich Kids", "5:04"],
      ["C2", "Pyramids", "9:52"],
      ["D2", "Pink Matter", "4:34"],
    ),
    pressings: [
      { year: 2012, country: "US", label: "Def Jam", catno: "B0017078-01", format: '2x12", LP, Album', price: 240 },
    ],
  },
  {
    title: "To Pimp a Butterfly",
    artist: "Kendrick Lamar",
    year: 2015,
    genre: "Hip Hop",
    style: "Conscious, Jazzy Hip-Hop",
    tracks: t(
      ["A1", "Wesley's Theory", "4:47"],
      ["B1", "King Kunta", "3:54"],
      ["C2", "Alright", "3:39"],
      ["D2", "i", "5:36"],
      ["D3", "Mortal Man", "12:07"],
    ),
    pressings: [
      { year: 2015, country: "US", label: "Top Dawg Entertainment", catno: "B0022954-01", format: '2x12", LP, Album', price: 45 },
    ],
  },
  {
    title: "In Rainbows",
    artist: "Radiohead",
    year: 2007,
    genre: "Rock",
    style: "Alternative Rock, Art Rock",
    tracks: t(
      ["A1", "15 Step", "3:57"],
      ["A2", "Bodysnatchers", "4:02"],
      ["A3", "Nude", "4:15"],
      ["B1", "Weird Fishes/Arpeggi", "5:18"],
      ["B4", "Reckoner", "4:50"],
    ),
    pressings: [
      { year: 2007, country: "UK", label: "XL Recordings", catno: "XLLP324", format: '12", LP, Album', price: 50 },
    ],
  },
  {
    title: "Unknown Pleasures",
    artist: "Joy Division",
    year: 1979,
    genre: "Rock",
    style: "Post-Punk",
    tracks: t(
      ["A1", "Disorder", "3:32"],
      ["A2", "Day of the Lords", "4:48"],
      ["B1", "She's Lost Control", "3:57"],
      ["B3", "Insight", "4:28"],
      ["B5", "I Remember Nothing", "5:56"],
    ),
    pressings: [
      { year: 1979, country: "UK", label: "Factory", catno: "FACT 10", format: '12", LP, Album, Textured', price: 160 },
      { year: 2015, country: "Europe", label: "London Records", catno: "2564625233", format: '12", 180g, Reissue', price: 26 },
    ],
  },
  {
    title: "Random Access Memories",
    artist: "Daft Punk",
    year: 2013,
    genre: "Electronic",
    style: "Disco, Synth-pop",
    tracks: t(
      ["A1", "Give Life Back to Music", "4:35"],
      ["A3", "Giorgio by Moroder", "9:04"],
      ["B2", "Get Lucky", "6:09"],
      ["C1", "Touch", "8:18"],
      ["D2", "Doin' It Right", "4:11"],
    ),
    pressings: [
      { year: 2013, country: "Europe", label: "Columbia", catno: "88883716861", format: '2x12", 180g, LP, Album', price: 38 },
    ],
  },
  {
    title: "Blonde on Blonde",
    artist: "Bob Dylan",
    year: 1966,
    genre: "Rock",
    style: "Folk Rock",
    tracks: t(
      ["A1", "Rainy Day Women #12 & 35", "4:37"],
      ["B2", "I Want You", "3:07"],
      ["C1", "Just Like a Woman", "4:52"],
      ["D1", "Sad Eyed Lady of the Lowlands", "11:23"],
    ),
    pressings: [
      { year: 1966, country: "US", label: "Columbia", catno: "C2L 41", format: '2x12", Mono, LP', price: 120 },
    ],
  },
  {
    title: "Aja",
    artist: "Steely Dan",
    year: 1977,
    genre: "Rock",
    style: "Jazz-Rock, Soft Rock",
    tracks: t(
      ["A1", "Black Cow", "5:10"],
      ["A2", "Aja", "7:57"],
      ["A3", "Deacon Blues", "7:37"],
      ["B2", "Josie", "4:33"],
    ),
    pressings: [
      { year: 1977, country: "US", label: "ABC Records", catno: "AB-1006", format: '12", LP, Album', price: 35 },
    ],
  },
  {
    title: "Spiderland",
    artist: "Slint",
    year: 1991,
    genre: "Rock",
    style: "Post-Rock, Math Rock",
    tracks: t(
      ["A1", "Breadcrumb Trail", "5:36"],
      ["A2", "Nosferatu Man", "5:35"],
      ["B1", "Don, Aman", "6:24"],
      ["B3", "Good Morning, Captain", "7:39"],
    ),
    pressings: [
      { year: 1991, country: "US", label: "Touch and Go", catno: "TG83", format: '12", LP, Album', price: 60 },
    ],
  },
  {
    title: "Voodoo",
    artist: "D'Angelo",
    year: 2000,
    genre: "Funk / Soul",
    style: "Neo Soul",
    tracks: t(
      ["A2", "Devil's Pie", "4:25"],
      ["B1", "Untitled (How Does It Feel)", "7:11"],
      ["C2", "Spanish Joint", "4:33"],
      ["D2", "Africa", "5:50"],
    ),
    pressings: [
      { year: 2000, country: "US", label: "Cheeba Sound", catno: "012 156 350-1", format: '2x12", LP, Album', price: 90 },
    ],
  },
]
