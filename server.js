const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// ─── Supabase Configuration ──────────────────────────────────────────────────
const SUPABASE_URL = 'https://rorwnqjzbnivrtndauof.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvcnducWp6Ym5pdnJ0bmRhdW9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1ODMwNTIsImV4cCI6MjA5MDE1OTA1Mn0.AtGMk8-z9OgL4JjfQELREmAn_OjS9qRmpMD9GioALPM';

// Create a Supabase client that operates as the authenticated user
// We use the user's own JWT for each request (Row-Level-Security applies properly)
function getSupabaseForUser(token) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}

// Admin client for server-side operations (uses anon key, meant for trusted server)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Directory Setup ───────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, 'uploads', 'temp');
const CATALOG_DIR = path.join(__dirname, 'catalog');

[UPLOAD_DIR, CATALOG_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

// ─── Auth Middleware ─────────────────────────────────────────────────────────
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
    req.userId = user.id;
    req.userToken = token;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

// ─── Multer: Temp Storage ───────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/jpeg|jpg|png|webp/i.test(path.extname(file.originalname))) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});

// ─── Mock AI Classifier ────────────────────────────────────────────────────
const CATEGORY_MAP = [
  { category: 'groceries', keywords: ['apple', 'banana', 'mango', 'orange', 'lemon', 'grape', 'fruit', 'vegetable', 'tomato', 'onion', 'potato', 'carrot', 'rice', 'wheat', 'bread', 'milk', 'egg', 'meat', 'fish', 'chicken', 'spice', 'oil', 'sugar', 'flour', 'tea', 'coffee', 'juice', 'cereal', 'grain', 'dairy', 'nut', 'pulse', 'sauce', 'pickle'] },
  { category: 'clothing', keywords: ['shirt', 'tshirt', 'pant', 'trouser', 'jeans', 'dress', 'skirt', 'kurta', 'saree', 'top', 'jacket', 'coat', 'hoodie', 'sweater', 'suit', 'cap', 'hat', 'shoe', 'sandal', 'boot', 'sock', 'belt', 'scarf', 'glove', 'purse', 'wallet', 'bag', 'uniform', 'apparel', 'fabric', 'wear', 'cloth'] },
  { category: 'electronics', keywords: ['phone', 'mobile', 'laptop', 'computer', 'tablet', 'camera', 'tv', 'television', 'headphone', 'speaker', 'charger', 'cable', 'battery', 'keyboard', 'mouse', 'monitor', 'printer', 'router', 'smartwatch', 'earphone', 'mic', 'console', 'gaming', 'bulb', 'led', 'fan', 'remote', 'gadget', 'device', 'wifi', 'usb'] },
  { category: 'household', keywords: ['plate', 'cup', 'glass', 'bowl', 'pot', 'pan', 'knife', 'spoon', 'fork', 'mop', 'broom', 'bucket', 'soap', 'detergent', 'curtain', 'pillow', 'blanket', 'towel', 'mat', 'rug', 'vase', 'lamp', 'candle', 'clock', 'frame', 'utensil', 'kitchen', 'cleaning', 'cookware', 'pressure', 'cooker', 'blender', 'mixer'] },
  { category: 'beauty', keywords: ['lipstick', 'cream', 'lotion', 'perfume', 'shampoo', 'conditioner', 'serum', 'moisturizer', 'foundation', 'blush', 'eyeshadow', 'mascara', 'nail', 'skincare', 'face', 'hair', 'deodorant', 'sunscreen', 'bodywash', 'gel', 'toner', 'cleanser', 'brush', 'comb', 'mirror', 'makeup', 'cosmetic', 'powder'] },
  { category: 'sports', keywords: ['ball', 'bat', 'racket', 'gym', 'fitness', 'yoga', 'cricket', 'football', 'basketball', 'tennis', 'badminton', 'cycling', 'bike', 'helmet', 'dumbbell', 'treadmill', 'swimming', 'golf', 'hockey', 'volleyball', 'skateboard', 'scooter', 'camping', 'hiking', 'gloves', 'weights', 'shuttle', 'wicket'] },
  { category: 'toys', keywords: ['toy', 'doll', 'lego', 'puzzle', 'board', 'game', 'play', 'teddy', 'stuffed', 'action', 'figure', 'train', 'block', 'crayon', 'paint', 'craft', 'robot', 'drone', 'baby', 'kids', 'plush', 'remote', 'car', 'cartoon', 'animated', 'slide', 'swing', 'clay'] },
  { category: 'furniture', keywords: ['sofa', 'couch', 'chair', 'table', 'desk', 'bed', 'shelf', 'rack', 'cabinet', 'wardrobe', 'bookcase', 'stool', 'bench', 'mattress', 'headboard', 'dresser', 'armchair', 'recliner', 'nightstand', 'drawer', 'almirah', 'wooden', 'metal', 'plastic', 'foam', 'cushion', 'divan'] },
];

const ALL_CATEGORIES = ['groceries', 'clothing', 'electronics', 'household', 'beauty', 'sports', 'toys', 'furniture', 'other'];

const CATEGORY_TAGS = {
  groceries: ['fresh_produce', 'daily_staples', 'organic_food', 'kitchen_ingredient', 'farm_fresh', 'packed_food', 'natural_ingredient'],
  clothing: ['casual_wear', 'daily_outfit', 'stylish_apparel', 'comfortable_wear', 'trendy_fashion', 'ethnic_wear', 'western_wear'],
  electronics: ['smart_device', 'digital_gadget', 'portable_electronics', 'wireless_tech', 'home_electronics', 'tech_accessory', 'power_device'],
  household: ['kitchen_essential', 'home_utility', 'daily_use_item', 'cleaning_supply', 'home_decor', 'storage_solution', 'cookware_item'],
  beauty: ['skincare_product', 'hair_care', 'face_treatment', 'personal_care', 'beauty_essential', 'grooming_item', 'natural_beauty'],
  sports: ['fitness_gear', 'sports_equipment', 'outdoor_activity', 'gym_accessory', 'athletic_wear', 'training_tool', 'sports_item'],
  toys: ['kids_toy', 'educational_toy', 'fun_activity', 'creative_play', 'childrens_game', 'plush_toy', 'learning_toy'],
  furniture: ['home_furniture', 'wooden_furniture', 'storage_furniture', 'bedroom_item', 'living_room', 'office_furniture', 'metal_furniture'],
  other: ['general_product', 'store_item', 'misc_product', 'unclassified_item'],
};

function mockClassify(originalName) {
  const name = (path.basename(originalName, path.extname(originalName))).toLowerCase();

  for (const { category, keywords } of CATEGORY_MAP) {
    const matched = keywords.find(k => name.includes(k));
    if (matched) {
      const tag = `${matched}_${category === 'groceries' ? 'item' : 'product'}`;
      const confidence = 0.78 + Math.random() * 0.15;
      console.log(`[MockAI] "${originalName}" → ${category} / ${tag}`);
      return { category, tag, confidence };
    }
  }

  const idx = Math.abs(name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % (ALL_CATEGORIES.length - 1);
  const category = ALL_CATEGORIES[idx];
  const tagPool = CATEGORY_TAGS[category];
  const tag = tagPool[Math.floor(Math.random() * tagPool.length)];
  const confidence = 0.60 + Math.random() * 0.15;

  console.log(`[MockAI] "${originalName}" → ${category} / ${tag} [auto-assigned]`);
  return { category, tag, confidence };
}

async function classifyImageWithAI(imagePath, originalName) {
  await new Promise(r => setTimeout(r, 400 + Math.random() * 500));
  return mockClassify(originalName);
}

// ─── Queue ──────────────────────────────────────────────────────────────────
const queue = [];
let isProcessing = false;
const processingStatus = new Map();

async function processNext() {
  if (isProcessing || queue.length === 0) return;
  isProcessing = true;
  const job = queue.shift();
  const { id, tempPath, originalName, userId, userToken } = job;

  try {
    console.log(`[Job ${id}] Starting processing for "${originalName}"...`);
    processingStatus.set(id, { status: 'classifying', progress: 30, originalName });
    const { category, tag, confidence } = await classifyImageWithAI(tempPath, originalName);

    processingStatus.set(id, { status: 'organizing', progress: 65, originalName, category, tag });

    const categoryDir = path.join(CATALOG_DIR, category);
    fs.mkdirSync(categoryDir, { recursive: true });

    const newFileName = `${category}_${tag}_${id.slice(0, 8)}.jpg`;
    const destPath = path.join(categoryDir, newFileName);
    fs.copyFileSync(tempPath, destPath);
    fs.unlinkSync(tempPath);

    const imageUrl = `/catalog/${category}/${newFileName}`;
    const product = {
      id,
      user_id: userId,
      original_name: originalName,
      file_name: newFileName,
      category,
      tags: tag.replace(/_/g, ' '),
      confidence: Math.round((confidence || 0.9) * 100),
      upload_time: new Date().toISOString(),
      image_url: imageUrl,
      status: 'done'
    };

    // Save to Supabase using user's token (RLS enforced)
    const supabase = getSupabaseForUser(userToken);
    const { error: upsertError } = await supabase
      .from('products')
      .upsert(product, { onConflict: 'id' });

    if (upsertError) {
      console.error(`[Job ${id}] Supabase upsert error:`, upsertError);
    }

    processingStatus.set(id, {
      status: 'done', progress: 100, originalName, category, tag,
      imageUrl, fileName: newFileName, confidence: Math.round((confidence || 0.9) * 100)
    });
    console.log(`[Job ${id}] Done! Category: ${category}, Tag: ${tag}`);
  } catch (err) {
    console.error(`[Job ${id}] error:`, err);
    processingStatus.set(id, { status: 'failed', progress: 0, originalName, error: err.message });
    try { fs.unlinkSync(tempPath); } catch { }
  } finally {
    isProcessing = false;
    setImmediate(processNext);
  }
}

// ─── Routes ─────────────────────────────────────────────────────────────────

app.post('/api/upload', authMiddleware, upload.array('images', 200), async (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

  const supabase = getSupabaseForUser(req.userToken);
  const jobs = req.files.map(file => {
    const id = uuidv4();
    // Insert placeholder row in Supabase
    supabase.from('products').insert({
      id,
      user_id: req.userId,
      original_name: file.originalname,
      file_name: file.filename,
      category: 'pending',
      tags: '',
      confidence: 0,
      status: 'queued',
      upload_time: new Date().toISOString()
    }).then(({ error }) => {
      if (error) console.error(`[Upload] Supabase insert error for ${id}:`, error);
    });

    processingStatus.set(id, { status: 'queued', progress: 5, originalName: file.originalname });
    queue.push({ id, tempPath: file.path, originalName: file.originalname, userId: req.userId, userToken: req.userToken });
    return { id, originalName: file.originalname };
  });

  setImmediate(processNext);
  res.json({ message: `${jobs.length} image(s) queued`, jobs });
});

app.post('/api/status/batch', authMiddleware, (req, res) => {
  const { ids } = req.body;
  const result = {};
  (ids || []).forEach(id => {
    result[id] = processingStatus.get(id) || { status: 'unknown', progress: 0 };
  });
  res.json(result);
});

app.get('/api/products', authMiddleware, async (req, res) => {
  const { category, search, page = 1, limit = 100 } = req.query;
  const supabase = getSupabaseForUser(req.userToken);

  let query = supabase
    .from('products')
    .select('*')
    .eq('status', 'done')
    .order('upload_time', { ascending: false })
    .range((parseInt(page) - 1) * parseInt(limit), parseInt(page) * parseInt(limit) - 1);

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  if (search) {
    query = query.or(`tags.ilike.%${search}%,file_name.ilike.%${search}%,original_name.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[Products] Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }

  res.json({ total: data?.length || 0, products: data || [] });
});

app.get('/api/stats', authMiddleware, async (req, res) => {
  const supabase = getSupabaseForUser(req.userToken);

  const { data, error } = await supabase.from('products').select('*');

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const products = data || [];
  const done = products.filter(p => p.status === 'done');
  const failed = products.filter(p => p.status === 'failed');

  const cats = {};
  done.forEach(p => { cats[p.category] = (cats[p.category] || 0) + 1; });

  res.json({
    total: products.length,
    done: done.length,
    failed: failed.length,
    queued: queue.length,
    categories: Object.entries(cats).map(([category, count]) => ({ category, count }))
  });
});

app.delete('/api/products/:id', authMiddleware, async (req, res) => {
  const supabase = getSupabaseForUser(req.userToken);

  // Get product first to delete the file
  const { data: product } = await supabase
    .from('products')
    .select('image_url')
    .eq('id', req.params.id)
    .single();

  if (product?.image_url) {
    try { fs.unlinkSync(path.join(__dirname, product.image_url)); } catch (err) { }
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', req.params.id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ message: 'Deleted' });
});

app.delete('/api/products/batch', authMiddleware, async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No IDs provided' });
  }

  const supabase = getSupabaseForUser(req.userToken);

  try {
    // Get products first to delete the files
    const { data: products } = await supabase
      .from('products')
      .select('image_url')
      .in('id', ids);

    if (products && products.length > 0) {
      products.forEach(p => {
        if (p.image_url) {
          try { fs.unlinkSync(path.join(__dirname, p.image_url)); } catch (err) { }
        }
      });
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .in('id', ids);

    if (error) throw error;

    res.json({ message: `Deleted ${ids.length} product(s)` });
  } catch (err) {
    console.error('[Batch Delete] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.use('/catalog', express.static(CATALOG_DIR));
app.use(express.static(path.join(__dirname, 'public')));

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Ganesh Store API running on http://localhost:${PORT}`);
  console.log(`[DB] Connected to Supabase: ${SUPABASE_URL}`);
});
