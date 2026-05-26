/**
 * Seed script — wipes and repopulates all tables with demo data.
 * Run: pnpm --filter @workspace/scripts run seed
 * Uses DATABASE_URL from environment (works for both dev and production).
 */

import bcrypt from "bcryptjs";
import { db, pool, usersTable, profilesTable, galleriesTable, artworksTable } from "@workspace/db";

// ── Art image pool (50 distinct public-domain images) ──────────────────────
// Sources: Wikimedia Commons, Met Museum open access, Art Institute Chicago
const ART_IMAGES: string[] = [
  // Islamic & Arab art — Wikimedia Commons
  "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Hagia_Sofia_Iznik_tiles.JPG/800px-Hagia_Sofia_Iznik_tiles.JPG",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Arabesque_Topkapi_ms_H._2153_fol._29a.jpg/800px-Arabesque_Topkapi_ms_H._2153_fol._29a.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Alhambra_Patio_de_los_Arrayanes.jpg/800px-Alhambra_Patio_de_los_Arrayanes.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Mamluk_Quran_BL_Add_MS_22406.jpg/800px-Mamluk_Quran_BL_Add_MS_22406.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Mosque_lamp%2C_Egypt%2C_1350-60_AD%2C_gilded_and_enamelled_glass_-_Aga_Khan_Museum_-_Ontario%2C_Canada_-_DSC05049.jpg/800px-Mosque_lamp%2C_Egypt%2C_1350-60_AD%2C_gilded_and_enamelled_glass_-_Aga_Khan_Museum_-_Ontario%2C_Canada_-_DSC05049.jpg",
  // Persian & Ottoman miniatures
  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Blackbird_on_Branch_by_Muhammad_Sadiq_Beg.jpg/800px-Blackbird_on_Branch_by_Muhammad_Sadiq_Beg.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Miraj_by_Sultan_Muhammad.jpg/800px-Miraj_by_Sultan_Muhammad.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Leyla_and_Majnun_at_school.jpg/800px-Leyla_and_Majnun_at_school.jpg",
  // Abstract & modern art — Wikimedia Commons
  "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1000px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Camille_Pissarro%2C_1897%2C_Boulevard_Montmartre%2C_Morning%2C_Grey_Weather%2C_oil_on_canvas%2C_73_x_92_cm%2C_National_Gallery_of_Victoria.jpg/1000px-thumbnail.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg/1000px-Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Claude_Monet%2C_Impression%2C_soleil_levant.jpg/1000px-Claude_Monet%2C_Impression%2C_soleil_levant.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Vincent_van_Gogh_-_Self-Portrait_-_Google_Art_Project_%28454045%29.jpg/800px-Vincent_van_Gogh_-_Self-Portrait_-_Google_Art_Project_%28454045%29.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/The_Scream.jpg/800px-The_Scream.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/800px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/1665_Girl_with_a_Pearl_Earring.jpg/800px-1665_Girl_with_a_Pearl_Earring.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/The_Lady_of_Shalott%2C_by_John_William_Waterhouse.jpg/800px-The_Lady_of_Shalott%2C_by_John_William_Waterhouse.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Klimt_The_Kiss.jpg/800px-Klimt_The_Kiss.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg/800px-Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/800px-PNG_transparency_demonstration_1.png",
  // Geometric & abstract
  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Mondrian_Composition_II_in_Red%2C_Blue%2C_and_Yellow.jpg/800px-Mondrian_Composition_II_in_Red%2C_Blue%2C_and_Yellow.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Vassily_Kandinsky%2C_1913_-_Composition_7.jpg/1000px-Vassily_Kandinsky%2C_1913_-_Composition_7.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Wassily_Kandinsky%2C_1926_-_Several_Circles%2C_Gugg_0910_25.jpg/800px-Wassily_Kandinsky%2C_1926_-_Several_Circles%2C_Gugg_0910_25.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Pieter_Bruegel_the_Elder_-_Hunters_in_the_Snow_%28Winter%29_-_Google_Art_Project.jpg/1000px-Pieter_Bruegel_the_Elder_-_Hunters_in_the_Snow_%28Winter%29_-_Google_Art_Project.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Francisco_de_Goya%2C_Saturno_devorando_a_su_hijo_%281819-1823%29.jpg/800px-Francisco_de_Goya%2C_Saturno_devorando_a_su_hijo_%281819-1823%29.jpg",
  // Met Museum open access — Islamic Art
  "https://images.metmuseum.org/CRDImages/is/original/DP234125.jpg",
  "https://images.metmuseum.org/CRDImages/is/original/DP251139.jpg",
  "https://images.metmuseum.org/CRDImages/is/original/DP159194.jpg",
  "https://images.metmuseum.org/CRDImages/is/original/DP215472.jpg",
  "https://images.metmuseum.org/CRDImages/is/original/DP215476.jpg",
  "https://images.metmuseum.org/CRDImages/is/original/DP215480.jpg",
  "https://images.metmuseum.org/CRDImages/is/original/DP215484.jpg",
  "https://images.metmuseum.org/CRDImages/is/original/DP215488.jpg",
  // Met Museum — European Paintings
  "https://images.metmuseum.org/CRDImages/ep/original/DT1567.jpg",
  "https://images.metmuseum.org/CRDImages/ep/original/DT1947.jpg",
  "https://images.metmuseum.org/CRDImages/ep/original/DT46.jpg",
  "https://images.metmuseum.org/CRDImages/ep/original/DT1502.jpg",
  "https://images.metmuseum.org/CRDImages/ep/original/DT375.jpg",
  "https://images.metmuseum.org/CRDImages/ep/original/DT1976.jpg",
  "https://images.metmuseum.org/CRDImages/ep/original/DT270.jpg",
  // Art Institute of Chicago — open access IIIF
  "https://www.artic.edu/iiif/2/25c31d8d-21a4-9ea1-1d73-6a2eca4dda7e/full/843,/0/default.jpg",
  "https://www.artic.edu/iiif/2/1adf2696-8489-499b-cad2-821d7fde4b33/full/843,/0/default.jpg",
  "https://www.artic.edu/iiif/2/831a05de-d3f6-f4fa-a460-23008dd58dda/full/843,/0/default.jpg",
  "https://www.artic.edu/iiif/2/dec724f1-d5a1-e7ea-be48-aa2abbe8b304/full/843,/0/default.jpg",
  "https://www.artic.edu/iiif/2/9926d1ef-f5da-c4d7-8874-a3fa4427a006/full/843,/0/default.jpg",
  "https://www.artic.edu/iiif/2/a6b1cdb3-accf-e634-5179-2f2f4a8d6a74/full/843,/0/default.jpg",
  "https://www.artic.edu/iiif/2/e966799b-97ee-1cc6-bd2f-a94b4b8bb8f9/full/843,/0/default.jpg",
  "https://www.artic.edu/iiif/2/73b2a70f-e83e-6a26-a0d5-5d3dac7d0e6f/full/843,/0/default.jpg",
];

// ── Data definitions ────────────────────────────────────────────────────────

const ARTISTS = [
  { username: "layla.nabulsi",  email: "layla@virtualartspace.jo",   display: "Layla Nabulsi",    bio: "Layla grew up in Jabal al-Weibdeh, Amman, where limestone walls and hanging jasmine shaped her visual language. Her practice explores the tension between tradition and contemporary Arab identity through large-format oil painting. She has exhibited across Amman, Beirut, and Berlin." },
  { username: "omar.khalil",    email: "omar@virtualartspace.jo",    display: "Omar Khalil",       bio: "Omar's geometric abstractions draw directly from the tilework of the Umayyad Mosque and the ornamental patterns he studied as a child in his family's tile workshop in downtown Amman. He works in acrylic and digital print, layering Islamic geometry with modernist minimalism." },
  { username: "sana.masri",     email: "sana@virtualartspace.jo",    display: "Sana al-Masri",    bio: "Sana al-Masri is a Palestinian-Jordanian photographer whose lens turns to the everyday poetry of Amman's streets — the chai vendors on Rainbow Street, the Roman Theatre at dusk, the balconies draped in laundry. Her images are quiet declarations of presence." },
  { username: "tariq.hamdan",   email: "tariq@virtualartspace.jo",   display: "Tariq Hamdan",      bio: "Tariq studied at the Faculty of Fine Arts at the University of Jordan and spent three years in residence at studios in Florence and Cairo. His oil-on-canvas work merges classical European technique with Arab subject matter, reimagining the Grand Tour through a Levantine eye." },
  { username: "reem.aziz",      email: "reem@virtualartspace.jo",    display: "Reem Aziz",         bio: "Reem's practice is rooted in Arabic calligraphy and its transformation into abstract mark-making. She writes to paint — her strokes begin as letters from Rumi or Mahmoud Darwish that dissolve into pure form. Each work is a meditation on language, silence, and the body." },
  { username: "khalid.barakat", email: "khalid@virtualartspace.jo",  display: "Khalid Barakat",    bio: "Khalid Barakat makes sculpture and mixed-media installations that respond to Jordan's archaeological landscape — Petra, Jerash, the copper mines of Wadi Faynan. He uses earth, found clay, and bronze casting alongside digital fabrication in his Amman studio." },
  { username: "dina.sabbagh",   email: "dina@virtualartspace.jo",    display: "Dina Sabbagh",      bio: "Dina is a textile artist and painter who learned to weave from her grandmother in Salt, Jordan. Her canvases are hybrid objects — painted, stitched, and unravelled — exploring the gendered labour of making in the Arab world and the intimacy woven into domestic craft." },
  { username: "yusuf.nassar",   email: "yusuf@virtualartspace.jo",   display: "Yusuf Nassar",      bio: "Yusuf Nassar's digital works interrogate how the Arab city is built and demolished — mapping Amman's informal neighbourhoods, contested spaces, and the architecture of displacement through data-driven generative art. He collaborates with urban planners, architects, and musicians." },
  { username: "nour.jamal",     email: "nour@virtualartspace.jo",    display: "Nour Jamal",        bio: "Nour is a painter and printmaker whose work centres on the flora and fauna of Jordan — the black irises of the highlands, the bougainvillea tumbling down Aqaba walls, the starlings over Wadi Rum. Her palette borrows from the natural pigments of the earth beneath her feet." },
  { username: "ibrahim.qasim",  email: "ibrahim@virtualartspace.jo", display: "Ibrahim Qasim",     bio: "Ibrahim Qasim works at the intersection of conceptual art and Sufi philosophy. His installations — often using light, mirror, and sound — invite the viewer into states of contemplation and dissolution. He has shown at Darat al-Funun, the Jordan National Gallery, and Art Dubai." },
];

const AVATAR_URLS = [
  "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&q=80",
  "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=200&q=80",
];

const GALLERY_THEMES = [
  "dark_void", "neon_grid", "purple_mist", "white_cube", "concrete_bunker",
] as const;

const GALLERY_TITLE_POOL = [
  "Echoes of the Citadel",
  "Between Two Rivers",
  "Limestone & Light",
  "The Weight of Jasmine",
  "Geometric Meditations",
  "Wadi Rum Visions",
  "Amman by Night",
  "Calligraphy in Motion",
  "The Roman Arch Revisited",
  "Urban Palimpsest",
  "Shades of Umber",
  "Beyond the Old City",
  "Salt & Stone",
  "Fragments of Memory",
  "Kufic Variations",
  "Shadows on White",
  "The Olive Grove",
  "Desert Chromatics",
  "Modern Arabesque",
  "Threshold",
  "Dead Sea Reflections",
  "The Copper Hills",
  "Petra at Dawn",
  "Jabal Qal'a",
  "Aqaba Blue",
  "The Black Iris Garden",
  "Jerash in Ruins",
  "Wadi Faynan Gold",
  "Bougainvillea Fall",
  "Letters to the Levant",
];

const ARTWORK_TITLES = [
  "Amber at Dusk", "The Limestone Veil", "Between Walls", "Jasmine Memory",
  "Golden Hour Study", "Citadel Fragment", "Wadi Floor", "Ink & Silence",
  "Geometric Prayer", "Amman Rooftops", "Desert Hymn", "The Fig Tree",
  "Shadow Letter", "Copper Seam", "Petra Blush", "Midnight Kufic",
  "Urban Erosion", "The Pink House", "Threshold Light", "Salt Flat",
  "Rainbow Street Fragment", "Arabesque No. 3", "Black Iris", "Wadi Mist",
  "The Old City Gate", "Burnt Umber Horizon", "Calligraphic Drift",
  "Stone Garden", "Olive Silence", "Muezzin Echo", "The Balcony",
  "Lapis Fragment", "Desert Mirror", "Sunken Relief", "Lattice Study",
  "Bronze Age", "The Water Jug", "Pomegranate Season", "Ash & Gold",
  "The Minaret", "Night Geometry", "Aqaba Spectrum", "Bedouin Embroidery",
  "Terracotta Noon", "The Hammam", "Fig Season", "Eastern Light Study",
  "Weave & Thread", "Clay Memory", "Copper Twilight",
];

const MEDIUMS = [
  "Oil on canvas", "Watercolour on paper", "Digital print", "Acrylic on wood",
  "Mixed media", "Ink on paper", "Photography", "Charcoal on linen",
  "Gouache on board", "Screen print", "Encaustic on panel",
];

const DIMENSIONS = [
  "120 × 90 cm", "60 × 80 cm", "200 × 150 cm", "50 × 70 cm",
  "90 × 90 cm", "180 × 120 cm", "40 × 60 cm", "100 × 70 cm",
  "150 × 100 cm", "80 × 60 cm",
];

const ARTWORK_DESCS = [
  "A meditative exploration of negative space and the light that pools in the crevices of old stone.",
  "Drawn from field studies made at dawn, this work captures the transient chromatics of the Jordanian plateau.",
  "A visual record of absence — the marks, scratches, and layered histories found on a single wall in Amman.",
  "The artist spent three months developing this palette from natural pigments sourced in Wadi Rum.",
  "Calligraphic strokes dissolve into pure abstraction, retaining only the muscle memory of the letter.",
  "An intimate portrait of urban life caught between tradition and accelerating change in downtown Amman.",
  "Geometric order meets organic fracture, echoing the tension in Levantine architecture across centuries.",
  "The composition emerged from improvised mark-making during a residency in the salt flats of the Dead Sea.",
  "Layers of translucent glaze build a chromatic depth reminiscent of ancient Mamluk illuminated manuscripts.",
  "A tribute to the artisans whose craft — invisible in the finished building — underpins an entire visual culture.",
];

// ── Artwork wall positions (5 per gallery) ─────────────────────────────────
const WALL_POSITIONS = [
  { x:  0.0, y: 1.5, z: -4.4, rotation:  0       },  // back wall centre
  { x: -1.8, y: 1.5, z: -4.4, rotation:  0       },  // back wall left
  { x:  1.8, y: 1.5, z: -4.4, rotation:  0       },  // back wall right
  { x: -4.4, y: 1.5, z: -1.5, rotation:  1.5708  },  // left wall
  { x:  4.4, y: 1.5, z: -1.5, rotation: -1.5708  },  // right wall
];

// ── Utility helpers ─────────────────────────────────────────────────────────
function makeSlug(title: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const suffix = Math.random().toString(16).slice(2, 6);
  return `${base}-${suffix}`;
}

function pick<T>(arr: T[], idx: number): T {
  return arr[idx % arr.length];
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Main seed ───────────────────────────────────────────────────────────────
async function seed() {
  console.log("Clearing existing data...");
  await db.delete(artworksTable);
  await db.delete(galleriesTable);
  await db.delete(profilesTable);
  await db.delete(usersTable);
  console.log("  ✓ All tables cleared");

  // Hash password once
  const passwordHash = await bcrypt.hash("demo1234", 10);

  // ── 1. Users ──────────────────────────────────────────────────────────────
  console.log("Inserting users...");
  const insertedUsers = await db
    .insert(usersTable)
    .values(
      ARTISTS.map((a) => ({
        email: a.email,
        username: a.username,
        passwordHash,
      }))
    )
    .returning();
  console.log(`  ✓ ${insertedUsers.length} users`);

  // ── 2. Profiles ───────────────────────────────────────────────────────────
  console.log("Inserting profiles...");
  const insertedProfiles = await db
    .insert(profilesTable)
    .values(
      insertedUsers.map((user, i) => ({
        userId: user.id,
        displayName: ARTISTS[i].display,
        bio: ARTISTS[i].bio,
        avatarUrl: AVATAR_URLS[i % AVATAR_URLS.length],
      }))
    )
    .returning();
  console.log(`  ✓ ${insertedProfiles.length} profiles`);

  // ── 3. Galleries ──────────────────────────────────────────────────────────
  console.log("Inserting galleries...");
  const galleryRows: {
    userId: number;
    title: string;
    description: string;
    roomTheme: string;
    published: boolean;
    slug: string;
    roomSeed: number;
    roomMode: string;
    roomSize: number;
    decorationLevel: number;
  }[] = [];

  let titleIdx = 0;
  insertedUsers.forEach((user, userIdx) => {
    for (let g = 0; g < 3; g++) {
      const themeIdx = (userIdx * 3 + g) % GALLERY_THEMES.length;
      const title = GALLERY_TITLE_POOL[titleIdx % GALLERY_TITLE_POOL.length];
      titleIdx++;
      galleryRows.push({
        userId: user.id,
        title,
        description: `A curated exhibition by ${ARTISTS[userIdx].display}. This gallery presents works exploring the artist's ongoing dialogue with Amman's visual and cultural landscape.`,
        roomTheme: GALLERY_THEMES[themeIdx],
        published: true,
        slug: makeSlug(title),
        roomSeed: rand(1, 9999),
        roomMode: g % 2 === 0 ? "basic" : "extended",
        roomSize: pick([4, 5, 6], userIdx + g),
        decorationLevel: rand(3, 7),
      });
    }
  });

  const insertedGalleries = await db
    .insert(galleriesTable)
    .values(galleryRows)
    .returning();
  console.log(`  ✓ ${insertedGalleries.length} galleries`);

  // ── 4. Artworks ───────────────────────────────────────────────────────────
  console.log("Inserting artworks...");
  const artworkRows: {
    galleryId: number;
    title: string;
    description: string;
    imageUrl: string;
    artistName: string;
    year: string;
    medium: string;
    dimensions: string;
    xPosition: number;
    yPosition: number;
    zPosition: number;
    rotation: number;
    scale: number;
    isManuallyPlaced: boolean;
  }[] = [];

  let artworkTitleIdx = 0;
  let imageIdx = 0;
  let descIdx = 0;

  insertedGalleries.forEach((gallery, galleryIdx) => {
    // Find the artist for this gallery
    const galleryRow = galleryRows[galleryIdx];
    const artistIdx = insertedUsers.findIndex((u) => u.id === galleryRow.userId);
    const artistName = ARTISTS[artistIdx]?.display ?? "Unknown Artist";

    for (let a = 0; a < 5; a++) {
      const pos = WALL_POSITIONS[a];
      artworkRows.push({
        galleryId: gallery.id,
        title: ARTWORK_TITLES[artworkTitleIdx % ARTWORK_TITLES.length],
        description: ARTWORK_DESCS[descIdx % ARTWORK_DESCS.length],
        imageUrl: ART_IMAGES[imageIdx % ART_IMAGES.length],
        artistName,
        year: String(rand(2018, 2024)),
        medium: pick(MEDIUMS, artworkTitleIdx),
        dimensions: pick(DIMENSIONS, artworkTitleIdx + a),
        xPosition: pos.x,
        yPosition: pos.y,
        zPosition: pos.z,
        rotation: pos.rotation,
        scale: 1.0,
        isManuallyPlaced: false,
      });
      artworkTitleIdx++;
      imageIdx++;
      descIdx++;
    }
  });

  const insertedArtworks = await db
    .insert(artworksTable)
    .values(artworkRows)
    .returning();
  console.log(`  ✓ ${insertedArtworks.length} artworks`);

  console.log("\nSeed complete.");
  console.log(`  ${insertedUsers.length} users`);
  console.log(`  ${insertedProfiles.length} profiles`);
  console.log(`  ${insertedGalleries.length} galleries`);
  console.log(`  ${insertedArtworks.length} artworks`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => pool.end());
