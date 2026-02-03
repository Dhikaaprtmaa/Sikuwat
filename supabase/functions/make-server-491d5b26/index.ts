import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2.91.0";

// Database functions for Sikuwat app
const dbClient = () => createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
);

const sikuwatDb = {
  // Market Prices
  addMarketPrice: async (priceData: any) => {
    const supabase = dbClient();
    const { data, error } = await supabase
      .from('market_prices')
      .insert(priceData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  getMarketPrices: async () => {
    const supabase = dbClient();
    const { data, error } = await supabase
      .from('market_prices')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  getMarketPriceById: async (id: string) => {
    const supabase = dbClient();
    const { data, error } = await supabase
      .from('market_prices')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  updateMarketPrice: async (id: string, updateData: any) => {
    const supabase = dbClient();
    const { data, error } = await supabase
      .from('market_prices')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deleteMarketPrice: async (id: string) => {
    const supabase = dbClient();
    const { error } = await supabase
      .from('market_prices')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // Tips & Tricks
  addTip: async (tipData: any) => {
    const supabase = dbClient();
    const { data, error } = await supabase
      .from('tips')
      .insert(tipData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  getTips: async () => {
    const supabase = dbClient();
    const { data, error } = await supabase
      .from('tips')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  getTipById: async (id: string) => {
    const supabase = dbClient();
    const { data, error } = await supabase
      .from('tips')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  updateTip: async (id: string, updateData: any) => {
    const supabase = dbClient();
    const { data, error } = await supabase
      .from('tips')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deleteTip: async (id: string) => {
    const supabase = dbClient();
    const { error } = await supabase
      .from('tips')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // Articles
  addArticle: async (articleData: any) => {
    const supabase = dbClient();
    const { data, error } = await supabase
      .from('articles')
      .insert(articleData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  getArticles: async () => {
    const supabase = dbClient();
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  getArticleById: async (id: string) => {
    const supabase = dbClient();
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  updateArticle: async (id: string, updateData: any) => {
    const supabase = dbClient();
    const { data, error } = await supabase
      .from('articles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deleteArticle: async (id: string) => {
    const supabase = dbClient();
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // Plantings
  addPlanting: async (plantingData: any) => {
    const supabase = dbClient();
    const { data, error } = await supabase
      .from('plantings')
      .insert(plantingData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  getUserPlantings: async (userId: string) => {
    const supabase = dbClient();
    const { data, error } = await supabase
      .from('plantings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  getPlantingById: async (id: string) => {
    const supabase = dbClient();
    const { data, error } = await supabase
      .from('plantings')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  updatePlanting: async (id: string, updateData: any) => {
    const supabase = dbClient();
    const { data, error } = await supabase
      .from('plantings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deletePlanting: async (id: string) => {
    const supabase = dbClient();
    const { error } = await supabase
      .from('plantings')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  getAllPlantings: async () => {
    const supabase = dbClient();
    const { data, error } = await supabase
      .from('plantings')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }
};

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Initialize Supabase clients
const getSupabaseAdmin = () => createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
);

const getSupabaseClient = () => createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_ANON_KEY') || '',
);

// Middleware to verify authentication
const verifyAuth = async (accessToken: string | undefined) => {
  if (!accessToken) {
    return { authenticated: false, userId: null };
  }

  const supabase = getSupabaseAdmin();
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (error || !user) {
    return { authenticated: false, userId: null };
  }

  return { authenticated: true, userId: user.id, user };
};

// Health check endpoint
app.get("/make-server-491d5b26/health", (c) => {
  return c.json({ status: "ok" });
});

// ============= AUTH ROUTES =============

// Sign up endpoint
app.post("/make-server-491d5b26/auth/signup", async (c) => {
  try {
    const { email, password, name, role } = await c.req.json();
    
    if (!email || !password || !name || !role) {
      return c.json({ error: "Email, password, name, and role are required" }, 400);
    }

    const supabase = getSupabaseAdmin();
    
    // Create user
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.error("Signup error:", error);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ 
      user: data.user,
      message: "User created successfully" 
    });
  } catch (error) {
    console.error("Signup error:", error);
    return c.json({ error: "Internal server error during signup" }, 500);
  }
});

// Sign in endpoint
app.post("/make-server-491d5b26/auth/signin", async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Signin error:", error);
      return c.json({ error: error.message }, 401);
    }

    return c.json({ 
      access_token: data.session?.access_token,
      user: data.user,
      role: data.user?.user_metadata?.role
    });
  } catch (error) {
    console.error("Signin error:", error);
    return c.json({ error: "Internal server error during signin" }, 500);
  }
});

// Get current session
app.get("/make-server-491d5b26/auth/session", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { authenticated, user } = await verifyAuth(accessToken);

    if (!authenticated) {
      return c.json({ authenticated: false }, 401);
    }

    return c.json({ 
      authenticated: true,
      user,
      role: user?.user_metadata?.role
    });
  } catch (error) {
    console.error("Session check error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ============= ADMIN ROUTES =============

// Add market price (Admin only)
app.post("/make-server-491d5b26/admin/market-prices", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { authenticated, user } = await verifyAuth(accessToken);

    if (!authenticated || user?.user_metadata?.role !== 'admin') {
      return c.json({ error: "Unauthorized - Admin access required" }, 401);
    }

    const { commodity, price, unit, date } = await c.req.json();
    
    if (!commodity || !price || !unit) {
      return c.json({ error: "Commodity, price, and unit are required" }, 400);
    }

    const priceData = {
      id: `price_${Date.now()}`,
      commodity,
      price,
      unit,
      date: date || new Date().toISOString(),
      created_by: user.id,
      created_at: new Date().toISOString()
    };

    const result = await sikuwatDb.addMarketPrice(priceData);

    return c.json({ 
      success: true,
      data: priceData 
    });
  } catch (error) {
    console.error("Error adding market price:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get all market prices
app.get("/make-server-491d5b26/market-prices", async (c) => {
  try {
    const prices = await sikuwatDb.getMarketPrices();
    return c.json({ 
      success: true,
      data: prices
    });
  } catch (error) {
    console.error("Error fetching market prices:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get market price by ID
app.get("/make-server-491d5b26/market-prices/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const price = await sikuwatDb.getMarketPriceById(id);
    return c.json({ 
      success: true,
      data: price
    });
  } catch (error) {
    console.error("Error fetching market price:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Update market price (Admin only)
app.put("/make-server-491d5b26/admin/market-prices/:id", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { authenticated, user } = await verifyAuth(accessToken);

    if (!authenticated || user?.user_metadata?.role !== 'admin') {
      return c.json({ error: "Unauthorized - Admin access required" }, 401);
    }

    const id = c.req.param('id');
    const { commodity, price, unit, date } = await c.req.json();
    
    if (!commodity || !price || !unit) {
      return c.json({ error: "Commodity, price, and unit are required" }, 400);
    }

    const updateData = {
      commodity,
      price,
      unit,
      date: date || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const result = await sikuwatDb.updateMarketPrice(id, updateData);

    return c.json({ 
      success: true,
      data: result 
    });
  } catch (error) {
    console.error("Error updating market price:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Delete market price (Admin only)
app.delete("/make-server-491d5b26/admin/market-prices/:id", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { authenticated, user } = await verifyAuth(accessToken);

    if (!authenticated || user?.user_metadata?.role !== 'admin') {
      return c.json({ error: "Unauthorized - Admin access required" }, 401);
    }

    const id = c.req.param('id');
    await sikuwatDb.deleteMarketPrice(id);

    return c.json({ 
      success: true,
      message: "Market price deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting market price:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Add tips & tricks (Admin only)
app.post("/make-server-491d5b26/admin/tips", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { authenticated, user } = await verifyAuth(accessToken);

    if (!authenticated || user?.user_metadata?.role !== 'admin') {
      return c.json({ error: "Unauthorized - Admin access required" }, 401);
    }

    // Read body and validate
    const body = await c.req.json();
    const title = body?.title;
    const content = body?.content;
    const category = body?.category;

    console.log('[FUNC] /admin/tips request from admin:', { admin_id: user.id, email: user.email, body });

    if (!title || !content) {
      console.warn('[FUNC] /admin/tips validation failed - title/content missing');
      return c.json({ error: "Title and content are required" }, 400);
    }

    const tipData = {
      id: `tip_${Date.now()}`,
      title,
      content,
      category: category || 'general',
      created_by: user.id,
      created_at: new Date().toISOString()
    };

    try {
      const result = await sikuwatDb.addTip(tipData);
      console.log('[FUNC] /admin/tips insert success:', { tip_id: tipData.id, result });
      return c.json({ 
        success: true,
        data: tipData 
      });
    } catch (dbErr) {
      console.error('[FUNC] /admin/tips DB insert error:', dbErr?.message || dbErr, { dbErr });
      return c.json({ error: 'Database error inserting tip', details: dbErr?.message || null }, 500);
    }
  } catch (error) {
    console.error("Error adding tip:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get all tips
app.get("/make-server-491d5b26/tips", async (c) => {
  try {
    const tips = await sikuwatDb.getTips();
    return c.json({ 
      success: true,
      data: tips
    });
  } catch (error) {
    console.error("Error fetching tips:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get tip by ID
app.get("/make-server-491d5b26/tips/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const tip = await sikuwatDb.getTipById(id);
    return c.json({ 
      success: true,
      data: tip
    });
  } catch (error) {
    console.error("Error fetching tip:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Update tip (Admin only)
app.put("/make-server-491d5b26/admin/tips/:id", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { authenticated, user } = await verifyAuth(accessToken);

    if (!authenticated || user?.user_metadata?.role !== 'admin') {
      return c.json({ error: "Unauthorized - Admin access required" }, 401);
    }

    const id = c.req.param('id');
    const { title, content, category } = await c.req.json();
    
    if (!title || !content) {
      return c.json({ error: "Title and content are required" }, 400);
    }

    const updateData = {
      title,
      content,
      category: category || 'general',
      updated_at: new Date().toISOString()
    };

    const result = await sikuwatDb.updateTip(id, updateData);

    return c.json({ 
      success: true,
      data: result 
    });
  } catch (error) {
    console.error("Error updating tip:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Delete tip (Admin only)
app.delete("/make-server-491d5b26/admin/tips/:id", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { authenticated, user } = await verifyAuth(accessToken);

    if (!authenticated || user?.user_metadata?.role !== 'admin') {
      return c.json({ error: "Unauthorized - Admin access required" }, 401);
    }

    const id = c.req.param('id');
    await sikuwatDb.deleteTip(id);

    return c.json({ 
      success: true,
      message: "Tip deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting tip:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Add article (Admin only)
app.post("/make-server-491d5b26/admin/articles", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { authenticated, user } = await verifyAuth(accessToken);

    if (!authenticated || user?.user_metadata?.role !== 'admin') {
      return c.json({ error: "Unauthorized - Admin access required" }, 401);
    }

    const { title, content, source, url, imageUrl } = await c.req.json();
    
    if (!title || !content) {
      return c.json({ error: "Title and content are required" }, 400);
    }

    const articleData = {
      id: `article_${Date.now()}`,
      title,
      content,
      source: source || '',
      url: url || '',
      image_url: imageUrl || '',
      created_by: user.id,
      created_at: new Date().toISOString()
    };

    const result = await sikuwatDb.addArticle(articleData);

    return c.json({ 
      success: true,
      data: articleData 
    });
  } catch (error) {
    console.error("Error adding article:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get all articles
app.get("/make-server-491d5b26/articles", async (c) => {
  try {
    const articles = await sikuwatDb.getArticles();
    return c.json({ 
      success: true,
      data: articles
    });
  } catch (error) {
    console.error("Error fetching articles:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get article by ID
app.get("/make-server-491d5b26/articles/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const article = await sikuwatDb.getArticleById(id);
    return c.json({ 
      success: true,
      data: article
    });
  } catch (error) {
    console.error("Error fetching article:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Update article (Admin only)
app.put("/make-server-491d5b26/admin/articles/:id", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { authenticated, user } = await verifyAuth(accessToken);

    if (!authenticated || user?.user_metadata?.role !== 'admin') {
      return c.json({ error: "Unauthorized - Admin access required" }, 401);
    }

    const id = c.req.param('id');
    const { title, content, source, url, imageUrl } = await c.req.json();
    
    if (!title || !content) {
      return c.json({ error: "Title and content are required" }, 400);
    }

    const updateData = {
      title,
      content,
      source: source || '',
      url: url || '',
      image_url: imageUrl || '',
      updated_at: new Date().toISOString()
    };

    const result = await sikuwatDb.updateArticle(id, updateData);

    return c.json({ 
      success: true,
      data: result 
    });
  } catch (error) {
    console.error("Error updating article:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Delete article (Admin only)
app.delete("/make-server-491d5b26/admin/articles/:id", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { authenticated, user } = await verifyAuth(accessToken);

    if (!authenticated || user?.user_metadata?.role !== 'admin') {
      return c.json({ error: "Unauthorized - Admin access required" }, 401);
    }

    const id = c.req.param('id');
    await sikuwatDb.deleteArticle(id);

    return c.json({ 
      success: true,
      message: "Article deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting article:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get all user data (Admin only)
app.get("/make-server-491d5b26/admin/user-data", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { authenticated, user } = await verifyAuth(accessToken);

    if (!authenticated || user?.user_metadata?.role !== 'admin') {
      return c.json({ error: "Unauthorized - Admin access required" }, 401);
    }

    const plantings = await sikuwatDb.getAllPlantings();
    return c.json({ 
      success: true,
      data: plantings
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ============= USER ROUTES =============

// Add planting data (User only)
app.post("/make-server-491d5b26/user/plantings", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { authenticated, userId, user } = await verifyAuth(accessToken);

    if (!authenticated || user?.user_metadata?.role !== 'user') {
      return c.json({ error: "Unauthorized - User access required" }, 401);
    }

    const { 
      seedType, 
      seedCount, 
      plantingDate, 
      harvestDate, 
      harvestYield, 
      salesAmount 
    } = await c.req.json();
    
    if (!seedType || !seedCount || !plantingDate) {
      return c.json({ error: "Seed type, count, and planting date are required" }, 400);
    }

    const plantingData = {
      id: `planting_${Date.now()}`,
      seed_type: seedType,
      seed_count: seedCount,
      planting_date: plantingDate,
      harvest_date: harvestDate || null,
      harvest_yield: harvestYield || null,
      sales_amount: salesAmount || null,
      user_id: userId,
      user_name: user.user_metadata?.name || user.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const result = await sikuwatDb.addPlanting(plantingData);

    return c.json({ 
      success: true,
      data: plantingData 
    });
  } catch (error) {
    console.error("Error adding planting data:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get user's planting data
app.get("/make-server-491d5b26/user/plantings", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { authenticated, userId } = await verifyAuth(accessToken);

    if (!authenticated) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userPlantings = await sikuwatDb.getUserPlantings(userId);
    return c.json({ 
      success: true,
      data: userPlantings
    });
  } catch (error) {
    console.error("Error fetching user plantings:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Update planting data
app.put("/make-server-491d5b26/user/plantings/:id", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { authenticated, userId } = await verifyAuth(accessToken);

    if (!authenticated) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const id = c.req.param('id');
    const existingData = await sikuwatDb.getPlantingById(id);

    if (!existingData || existingData.user_id !== userId) {
      return c.json({ error: "Planting data not found or unauthorized" }, 404);
    }

    const updateFields = await c.req.json();
    const updatedData = {
      ...updateFields,
      updated_at: new Date().toISOString()
    };

    const result = await sikuwatDb.updatePlanting(id, updatedData);

    return c.json({ 
      success: true,
      data: updatedData 
    });
  } catch (error) {
    console.error("Error updating planting data:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Delete planting data (User only)
app.delete("/make-server-491d5b26/user/plantings/:id", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { authenticated, userId } = await verifyAuth(accessToken);

    if (!authenticated) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const id = c.req.param('id');
    const existingData = await sikuwatDb.getPlantingById(id);

    if (!existingData || existingData.user_id !== userId) {
      return c.json({ error: "Planting data not found or unauthorized" }, 404);
    }

    await sikuwatDb.deletePlanting(id);

    return c.json({ 
      success: true,
      message: "Planting data deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting planting data:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// AI Chat endpoint (mock - untuk pertanyaan pertanian)
app.post("/make-server-491d5b26/chat", async (c) => {
  try {
    const { message } = await c.req.json();
    
    if (!message) {
      return c.json({ error: "Message is required" }, 400);
    }

    // Mock AI response - dalam produksi, ini bisa menggunakan API AI yang sebenarnya
    const responses: Record<string, string> = {
      "cara menanam": "Untuk menanam bibit: 1) Pilih bibit berkualitas, 2) Siapkan lahan yang gembur, 3) Tanam dengan jarak yang tepat, 4) Siram secara teratur.",
      "pupuk": "Gunakan pupuk organik seperti kompos atau pupuk kandang. Aplikasikan 2 minggu sebelum tanam dan saat tanaman berumur 1 bulan.",
      "hama": "Untuk mengatasi hama: 1) Gunakan pestisida organik, 2) Tanam tanaman pengusir hama, 3) Lakukan rotasi tanaman.",
      "panen": "Waktu panen tergantung jenis tanaman. Umumnya 2-4 bulan setelah tanam. Panen saat pagi hari untuk hasil terbaik.",
      "default": "Saya adalah asisten pertanian AI. Saya dapat membantu Anda dengan informasi tentang cara menanam, pupuk, hama, dan panen. Silakan tanyakan hal spesifik!"
    };

    const lowerMessage = message.toLowerCase();
    let response = responses.default;

    for (const [key, value] of Object.entries(responses)) {
      if (lowerMessage.includes(key)) {
        response = value;
        break;
      }
    }

    return c.json({ 
      success: true,
      response 
    });
  } catch (error) {
    console.error("Error in chat:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

Deno.serve(app.fetch);
