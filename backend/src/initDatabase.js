import Database from 'better-sqlite3';
import fs from 'fs';

/*
-- Menu items (what you sell)
CREATE TABLE menu_items (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    price           DECIMAL(10, 2) NOT NULL,
    included        TEXT,  -- included add-ons like fried rice or white rice
    category        VARCHAR(50),  -- 'appetizer', 'entree', 'soup', 'side order', 'drink' etc.
);

-- Orders (the main order record)
CREATE TABLE orders (
    id              SERIAL PRIMARY KEY,
    order_number    VARCHAR(20) UNIQUE NOT NULL,  -- e.g., 'ORD-20251225-001'
    phone_number    VARCHAR(20) NOT NULL,
    status          VARCHAR(20) DEFAULT 'pending',  -- pending, confirmed, preparing, ready, completed, cancelled
    order_type      VARCHAR(20) DEFAULT 'pickup',   -- pickup, delivery
    total           DECIMAL(10, 2),
    notes           TEXT,  -- general order notes
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- Order items (individual items in an order)
CREATE TABLE order_items (
    id              SERIAL PRIMARY KEY,
    order_id        INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id    INTEGER REFERENCES menu_items(id),
    item_name       VARCHAR(100) NOT NULL,  -- snapshot of name at order time
    quantity        INTEGER DEFAULT 1,
    unit_price      DECIMAL(10, 2) NOT NULL,  -- snapshot of price at order time
    total           DECIMAL(10, 2) NOT NULL,  -- quantity * unit_price
    notes           TEXT,  -- "no onions", "extra spicy", etc.
    created_at      TIMESTAMP DEFAULT NOW()
);
*/



// Create/open the database
const db = new Database('fareast.db');

// Create the menu_items table
db.exec(`
  CREATE TABLE IF NOT EXISTS menu_items (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    item_number     TEXT,
    name            TEXT NOT NULL,
    description     TEXT,
    price_small     REAL,
    price_large     REAL,
    price_single    REAL,
    included        TEXT,
    category        TEXT,
    is_spicy        INTEGER DEFAULT 0
  );
`);

// Clear existing data (for re-runs)
db.exec('DELETE FROM menu_items');

// Insert statement
const insert = db.prepare(`
  INSERT INTO menu_items (item_number, name, description, price_small, price_large, price_single, included, category, is_spicy)
  VALUES (@item_number, @name, @description, @price_small, @price_large, @price_single, @included, @category, @is_spicy)
`);

// Menu data - parsed from menu_with_descriptions.txt
const menuItems = [
  // ==================== APPETIZERS ====================
  { item_number: '1', name: 'Vegetable Egg Roll', description: 'Crispy fried roll stuffed with seasoned cabbage and vegetables.', price_single: 1.90, category: 'Appetizers', included: null },
  { item_number: '2', name: 'Roast Pork Egg Roll', description: 'Crispy fried roll filled with seasoned roast pork and vegetables.', price_single: 1.90, category: 'Appetizers', included: null },
  { item_number: '3', name: 'Shrimp Egg Roll', description: 'Crispy fried roll stuffed with shrimp and vegetables.', price_single: 2.00, category: 'Appetizers', included: null },
  { item_number: '4', name: 'Vegetable Spring Roll', description: 'Light, crispy wrapper filled with fresh vegetables.', price_single: 2.00, category: 'Appetizers', included: null },
  { item_number: '5', name: 'Bar-B-Q Spare Ribs', description: 'Tender pork ribs glazed with sweet and savory BBQ sauce.', price_small: 9.25, price_large: 17.35, category: 'Appetizers', included: null },
  { item_number: '6', name: 'Boneless Spare Ribs', description: 'Strips of marinated pork in sweet BBQ sauce, no bones.', price_small: 8.95, price_large: 16.35, category: 'Appetizers', included: null },
  { item_number: '7', name: 'Chinese Donut', description: 'Fried dough, lightly sweet and crispy.', price_single: 6.25, category: 'Appetizers', included: null },
  { item_number: '8', name: 'Fantail Shrimp', description: 'Butterflied shrimp, battered and deep-fried until golden.', price_single: 4.25, category: 'Appetizers', included: null },
  { item_number: '9', name: 'Shrimp Toast', description: 'Crispy fried bread topped with seasoned minced shrimp.', price_single: 6.25, category: 'Appetizers', included: null },
  { item_number: '10', name: 'Fried Wonton w. Sweet & Sour Sauce', description: 'Crispy pork-filled dumplings served with tangy dipping sauce.', price_single: 6.25, category: 'Appetizers', included: null },
  { item_number: '11', name: 'Wonton w. Sesame Sauce', description: 'Tender pork dumplings drizzled with savory sesame sauce.', price_single: 7.25, category: 'Appetizers', included: null },
  { item_number: '12', name: 'Dumplings', description: 'Steamed or fried pork-filled dumplings.', price_single: 7.35, category: 'Appetizers', included: null },
  { item_number: '13', name: 'Sesame Noodles', description: 'Cold noodles tossed in creamy sesame peanut sauce.', price_single: 7.35, category: 'Appetizers', included: null },
  { item_number: '14', name: 'Pu Pu Platter', description: 'Sampler platter with assorted appetizers for sharing.', price_single: 15.95, category: 'Appetizers', included: null },
  { item_number: '15', name: 'Teriyaki Chicken', description: 'Grilled chicken pieces glazed with sweet teriyaki sauce.', price_single: 6.95, category: 'Appetizers', included: null },
  { item_number: '16', name: 'Fried Jumbo Shrimp', description: 'Large shrimp battered and fried until crispy.', price_single: 7.95, category: 'Appetizers', included: null },
  { item_number: '17', name: 'Crab Rangoon', description: 'Crispy wontons filled with cream cheese and crab.', price_single: 6.25, category: 'Appetizers', included: null },
  { item_number: '18', name: 'French Fries', description: 'Classic golden fried potato strips.', price_small: 3.35, price_large: 5.45, category: 'Appetizers', included: null },

  // ==================== SOUP ====================
  { item_number: '19', name: 'Wonton Soup', description: 'Clear broth with pork-filled wonton dumplings.', price_small: 3.35, price_large: 5.35, category: 'Soup', included: 'Crisp Noodles' },
  { item_number: '20', name: 'Egg Drop Soup', description: 'Silky beaten egg ribbons in savory chicken broth.', price_small: 3.35, price_large: 5.35, category: 'Soup', included: 'Crisp Noodles' },
  { item_number: '21', name: 'Chicken Rice Soup', description: 'Comforting broth with tender chicken and rice.', price_small: 3.35, price_large: 5.35, category: 'Soup', included: 'Crisp Noodles' },
  { item_number: '22', name: 'Chicken Noodles Soup', description: 'Savory broth with chicken pieces and soft noodles.', price_small: 3.35, price_large: 5.35, category: 'Soup', included: 'Crisp Noodles' },
  { item_number: '23', name: 'Pork Yat Gaw Mein', description: 'Noodle soup with roast pork and vegetables in broth.', price_single: 5.95, category: 'Soup', included: 'Crisp Noodles' },
  { item_number: '24', name: 'Wonton Egg Drop Soup', description: 'Combination of wonton dumplings and egg ribbons in broth.', price_small: 3.95, price_large: 5.95, category: 'Soup', included: 'Crisp Noodles' },
  { item_number: '25', name: 'Hot & Sour Soup', description: 'Tangy and spicy soup with tofu, vegetables, and egg.', price_small: 3.95, price_large: 5.95, category: 'Soup', included: 'Crisp Noodles', is_spicy: 1 },
  { item_number: '26', name: 'Fried Wonton Soup', description: 'Crispy fried wontons served in savory broth.', price_large: 7.35, category: 'Soup', included: 'Crisp Noodles' },
  { item_number: '27', name: 'Veg. w. Bean Curd Soup', description: 'Light vegetable soup with soft tofu cubes.', price_large: 5.95, category: 'Soup', included: 'Crisp Noodles' },
  { item_number: '27a', name: 'House Special Mei Fun Soup', description: 'Rice noodle soup with assorted meats and vegetables.', price_large: 7.35, category: 'Soup', included: 'Crisp Noodles' },
  { item_number: '27b', name: 'House Special Chow Fun Soup', description: 'Wide rice noodle soup with mixed meats and vegetables.', price_large: 7.35, category: 'Soup', included: 'Crisp Noodles' },
  { item_number: '27c', name: 'House Special Soup', description: "Chef's signature soup with assorted meats and vegetables.", price_large: 7.35, category: 'Soup', included: 'Crisp Noodles' },

  // ==================== CHOW MEIN ====================
  { item_number: '28', name: 'Chicken Chow Mein', description: 'Tender chicken with bean sprouts and vegetables in savory sauce.', price_small: 7.35, price_large: 10.55, category: 'Chow Mein', included: 'White Rice & Crisp Noodles' },
  { item_number: '29', name: 'Roast Pork Chow Mein', description: 'Sliced roast pork with bean sprouts and vegetables.', price_small: 7.35, price_large: 10.55, category: 'Chow Mein', included: 'White Rice & Crisp Noodles' },
  { item_number: '30', name: 'Mixed Vegetable Chow Mein', description: 'Assorted fresh vegetables in light savory sauce.', price_small: 6.95, price_large: 10.15, category: 'Chow Mein', included: 'White Rice & Crisp Noodles' },
  { item_number: '31', name: 'Beef Chow Mein', description: 'Sliced beef with bean sprouts and vegetables.', price_small: 7.95, price_large: 11.15, category: 'Chow Mein', included: 'White Rice & Crisp Noodles' },
  { item_number: '32', name: 'Shrimp Chow Mein', description: 'Tender shrimp with bean sprouts and vegetables.', price_small: 7.95, price_large: 11.15, category: 'Chow Mein', included: 'White Rice & Crisp Noodles' },
  { item_number: '33', name: 'Special Chow Mein', description: 'Combination of shrimp, chicken, and pork with vegetables.', price_small: 7.95, price_large: 11.15, category: 'Chow Mein', included: 'White Rice & Crisp Noodles' },

  // ==================== CHOW FUN / MEI FUN ====================
  { item_number: '34', name: 'Roast Pork Chow Fun or Mei Fun', description: 'Wide or thin rice noodles stir-fried with sliced roast pork.', price_single: 10.55, category: 'Chow Fun / Mei Fun', included: null },
  { item_number: '35', name: 'Chicken Chow Fun or Mei Fun', description: 'Wide or thin rice noodles stir-fried with tender chicken.', price_single: 10.55, category: 'Chow Fun / Mei Fun', included: null },
  { item_number: '36', name: 'Beef Chow Fun or Mei Fun', description: 'Wide or thin rice noodles stir-fried with sliced beef.', price_single: 10.95, category: 'Chow Fun / Mei Fun', included: null },
  { item_number: '37', name: 'Shrimp Chow Fun or Mei Fun', description: 'Wide or thin rice noodles stir-fried with tender shrimp.', price_single: 10.95, category: 'Chow Fun / Mei Fun', included: null },
  { item_number: '38', name: 'Special Chow Fun or Mei Fun', description: 'Wide or thin rice noodles with shrimp, chicken, and pork.', price_single: 11.55, category: 'Chow Fun / Mei Fun', included: null },
  { item_number: '39', name: 'Vegetable Chow Fun or Mei Fun', description: 'Wide or thin rice noodles stir-fried with mixed vegetables.', price_single: 10.15, category: 'Chow Fun / Mei Fun', included: null },
  { item_number: '39a', name: 'Singapore Mei Fun', description: 'Thin rice noodles stir-fried with curry, shrimp, pork, and vegetables.', price_single: 11.55, category: 'Chow Fun / Mei Fun', included: null, is_spicy: 1 },

  // ==================== CHOP SUEY ====================
  { item_number: '40', name: 'Mixed Vegetable Chop Suey', description: 'Assorted vegetables stir-fried in light sauce.', price_small: 6.95, price_large: 10.15, category: 'Chop Suey', included: 'White Rice' },
  { item_number: '41', name: 'Roast Pork Chop Suey', description: 'Sliced roast pork with mixed vegetables in sauce.', price_small: 7.35, price_large: 10.55, category: 'Chop Suey', included: 'White Rice' },
  { item_number: '42', name: 'Beef Chop Suey', description: 'Sliced beef with mixed vegetables in savory sauce.', price_small: 7.95, price_large: 11.15, category: 'Chop Suey', included: 'White Rice' },
  { item_number: '43', name: 'Shrimp Chop Suey', description: 'Tender shrimp with mixed vegetables in sauce.', price_small: 7.95, price_large: 11.15, category: 'Chop Suey', included: 'White Rice' },
  { item_number: '44', name: 'Chicken Chop Suey', description: 'Diced chicken with mixed vegetables in light sauce.', price_small: 7.35, price_large: 10.55, category: 'Chop Suey', included: 'White Rice' },
  { item_number: '45', name: 'Special Chop Suey', description: 'Combination of shrimp, chicken, and pork with vegetables.', price_small: 7.95, price_large: 10.95, category: 'Chop Suey', included: 'White Rice' },

  // ==================== FRIED RICE ====================
  { item_number: '46', name: 'Vegetable Fried Rice', description: 'Wok-fried rice with mixed vegetables and egg.', price_small: 5.55, price_large: 9.55, category: 'Fried Rice', included: null },
  { item_number: '47', name: 'Roast Pork Fried Rice', description: 'Wok-fried rice with diced roast pork and egg.', price_small: 5.95, price_large: 9.95, category: 'Fried Rice', included: null },
  { item_number: '48', name: 'Shrimp Fried Rice', description: 'Wok-fried rice with tender shrimp and egg.', price_small: 6.75, price_large: 10.55, category: 'Fried Rice', included: null },
  { item_number: '49', name: 'Chicken Fried Rice', description: 'Wok-fried rice with diced chicken and egg.', price_small: 5.95, price_large: 9.95, category: 'Fried Rice', included: null },
  { item_number: '49a', name: 'Beef Fried Rice', description: 'Wok-fried rice with sliced beef and egg.', price_small: 6.75, price_large: 10.55, category: 'Fried Rice', included: null },
  { item_number: '50', name: 'House Special Fried Rice', description: 'Wok-fried rice with shrimp, chicken, pork, and egg.', price_small: 6.95, price_large: 10.95, category: 'Fried Rice', included: null },

  // ==================== LO MEIN ====================
  { item_number: '51', name: 'Vegetable Lo Mein', description: 'Soft egg noodles stir-fried with mixed vegetables.', price_small: 7.25, price_large: 10.75, category: 'Lo Mein', included: null },
  { item_number: '52', name: 'Roast Pork Lo Mein', description: 'Soft egg noodles stir-fried with sliced roast pork.', price_small: 7.75, price_large: 10.95, category: 'Lo Mein', included: null },
  { item_number: '53', name: 'Beef Lo Mein', description: 'Soft egg noodles stir-fried with tender sliced beef.', price_small: 7.95, price_large: 11.55, category: 'Lo Mein', included: null },
  { item_number: '54', name: 'Chicken Lo Mein', description: 'Soft egg noodles stir-fried with diced chicken.', price_small: 7.75, price_large: 10.95, category: 'Lo Mein', included: null },
  { item_number: '55', name: 'Shrimp Lo Mein', description: 'Soft egg noodles stir-fried with tender shrimp.', price_small: 7.95, price_large: 11.55, category: 'Lo Mein', included: null },
  { item_number: '56', name: 'Special Lo Mein', description: 'Soft egg noodles with shrimp, chicken, and pork.', price_small: 8.25, price_large: 11.95, category: 'Lo Mein', included: null },

  // ==================== SIDE ORDER ====================
  { item_number: 'S1', name: 'White Rice', description: 'Steamed jasmine white rice.', price_small: 3.00, price_large: 4.00, category: 'Side Order', included: null },
  { item_number: 'S2', name: 'Fortune Cookie', description: 'Crispy cookies with paper fortunes inside.', price_single: 1.00, category: 'Side Order', included: null },
  { item_number: 'S3', name: 'Soda (Can)', description: 'Assorted canned soft drinks.', price_single: 1.30, category: 'Side Order', included: null },
  { item_number: 'S4', name: 'Crispy Noodle', description: 'Crunchy fried noodles for topping soups or eating plain.', price_single: 1.00, category: 'Side Order', included: null },
  { item_number: 'S5', name: 'Homemade Iced Tea', description: 'Refreshing house-brewed chilled tea.', price_single: 2.50, category: 'Side Order', included: null },

  // ==================== CHEF'S SPECIALTIES ====================
  { item_number: 'C1', name: 'Jumbo Shrimp or Beef Szechuan Style', description: 'Large shrimp or beef stir-fried in spicy Szechuan chili sauce.', price_single: 13.35, category: "Chef's Specialties", included: 'White Rice', is_spicy: 1 },
  { item_number: 'C2', name: 'Pork or Chicken Szechuan Style', description: 'Tender pork or chicken in spicy Szechuan chili sauce.', price_single: 12.55, category: "Chef's Specialties", included: 'White Rice', is_spicy: 1 },
  { item_number: 'C3', name: 'Crispy Shrimp', description: 'Lightly battered shrimp fried until golden and crispy.', price_single: 13.95, category: "Chef's Specialties", included: 'White Rice' },
  { item_number: 'C4', name: 'Jumbo Shrimp or Beef Hunan Style', description: 'Large shrimp or beef in spicy Hunan sauce with vegetables.', price_single: 13.35, category: "Chef's Specialties", included: 'White Rice', is_spicy: 1 },
  { item_number: 'C5', name: 'Pork or Chicken Hunan Style', description: 'Tender pork or chicken in spicy Hunan sauce with vegetables.', price_single: 12.55, category: "Chef's Specialties", included: 'White Rice', is_spicy: 1 },
  { item_number: 'C6', name: 'Moo Shu Pork or Chicken', description: 'Shredded pork or chicken with vegetables, served with pancakes.', price_single: 12.55, category: "Chef's Specialties", included: 'White Rice' },
  { item_number: 'C7', name: 'Moo Shu Shrimp or Beef', description: 'Shredded shrimp or beef with vegetables, served with pancakes.', price_single: 13.35, category: "Chef's Specialties", included: 'White Rice' },
  { item_number: 'C8', name: 'Kung Po Chicken', description: 'Diced chicken stir-fried with peanuts and dried chilies.', price_single: 12.55, category: "Chef's Specialties", included: 'White Rice', is_spicy: 1 },
  { item_number: 'C9', name: 'Kung Po Shrimp or Beef', description: 'Shrimp or beef stir-fried with peanuts and dried chilies.', price_single: 13.35, category: "Chef's Specialties", included: 'White Rice', is_spicy: 1 },
  { item_number: 'C10', name: 'Beef w. Garlic Sauce', description: 'Sliced beef in savory brown garlic sauce.', price_single: 13.35, category: "Chef's Specialties", included: 'White Rice' },
  { item_number: 'C11', name: 'Pork or Chicken w. Garlic Sauce', description: 'Tender pork or chicken in savory brown garlic sauce.', price_single: 12.55, category: "Chef's Specialties", included: 'White Rice' },
  { item_number: 'C12', name: 'Shrimp w. Garlic Sauce', description: 'Tender shrimp in savory brown garlic sauce.', price_single: 13.35, category: "Chef's Specialties", included: 'White Rice' },
  { item_number: 'C13', name: 'Sun See w. Garlic Sauce', description: 'Triple meat combination in savory garlic sauce.', price_single: 13.75, category: "Chef's Specialties", included: 'White Rice' },
  { item_number: 'C14', name: 'Hot & Spicy Shrimp', description: 'Shrimp stir-fried in fiery chili sauce with vegetables.', price_single: 13.35, category: "Chef's Specialties", included: 'White Rice', is_spicy: 1 },
  { item_number: 'C15', name: 'Sesame Beef or Orange Beef', description: 'Crispy beef in sweet sesame glaze or tangy orange sauce.', price_single: 13.95, category: "Chef's Specialties", included: 'White Rice' },
  { item_number: 'C16', name: "General Tso's Chicken", description: 'Crispy chicken chunks in sweet and spicy chili glaze.', price_single: 12.95, category: "Chef's Specialties", included: 'White Rice', is_spicy: 1 },
  { item_number: 'C17', name: 'Pork or Beef w. Scallion Sauce', description: 'Tender pork or beef stir-fried with fresh scallions.', price_single: 12.95, category: "Chef's Specialties", included: 'White Rice', is_spicy: 1 },
  { item_number: 'C18', name: 'Scallops w. Garlic Sauce', description: 'Tender sea scallops in savory brown garlic sauce.', price_single: 13.35, category: "Chef's Specialties", included: 'White Rice' },
  { item_number: 'C19', name: 'Sesame Chicken', description: 'Crispy chicken chunks coated in sweet sesame glaze.', price_single: 12.95, category: "Chef's Specialties", included: 'White Rice' },
  { item_number: 'C20', name: 'Crispy Chicken w. Orange Flavor', description: 'Crispy fried chicken in tangy sweet orange sauce.', price_single: 12.95, category: "Chef's Specialties", included: 'White Rice', is_spicy: 1 },
  { item_number: 'C21', name: 'Shrimp & Scallops Hunan Style', description: 'Shrimp and scallops in spicy Hunan sauce with vegetables.', price_single: 13.95, category: "Chef's Specialties", included: 'White Rice', is_spicy: 1 },
  { item_number: 'C22', name: 'Beef & Scallops Hunan Style', description: 'Sliced beef and scallops in spicy Hunan sauce.', price_single: 13.95, category: "Chef's Specialties", included: 'White Rice', is_spicy: 1 },
  { item_number: 'C23', name: 'Three Delights', description: 'Shrimp, chicken, and beef with mixed vegetables.', price_single: 13.75, category: "Chef's Specialties", included: 'White Rice' },
  { item_number: 'C24', name: 'Four Seasons', description: 'Shrimp, chicken, beef, and pork with seasonal vegetables.', price_single: 13.95, category: "Chef's Specialties", included: 'White Rice' },
  { item_number: 'C25', name: 'Happy Family', description: 'Lobster, shrimp, chicken, beef, and pork with vegetables.', price_single: 16.95, category: "Chef's Specialties", included: 'White Rice' },
  { item_number: 'C26', name: 'Tung-Ting Shrimp', description: 'Jumbo shrimp in mild egg white sauce with vegetables.', price_single: 13.35, category: "Chef's Specialties", included: 'White Rice' },
  { item_number: 'C27', name: 'Chicken w. Baby Shrimp', description: 'Diced chicken and small shrimp in light sauce.', price_single: 12.95, category: "Chef's Specialties", included: 'White Rice' },
  { item_number: 'C28', name: 'Dragon & Phoenix', description: 'Jumbo shrimp and chicken in savory brown sauce.', price_single: 13.95, category: "Chef's Specialties", included: 'White Rice' },
  { item_number: 'C29', name: 'Lemon Chicken', description: 'Crispy chicken breast topped with tangy lemon sauce.', price_single: 11.95, category: "Chef's Specialties", included: 'White Rice' },
  { item_number: 'C30', name: 'Subgum Wonton', description: 'Crispy wontons with shrimp, chicken, and vegetables.', price_single: 13.95, category: "Chef's Specialties", included: 'White Rice' },
  { item_number: 'C31', name: 'Butterfly Shrimp w. Bacon', description: 'Jumbo shrimp wrapped in bacon and fried crispy.', price_single: 13.95, category: "Chef's Specialties", included: 'White Rice' },
  { item_number: 'C32', name: 'Wor Shu Duck', description: 'Boneless roast duck with mixed vegetables in brown sauce.', price_single: 15.95, category: "Chef's Specialties", included: 'White Rice' },
  { item_number: 'C33', name: 'Special Duck', description: "Half roast duck with chef's special preparation.", price_single: 17.95, category: "Chef's Specialties", included: 'White Rice' },
  { item_number: '34', name: 'Seafood Delight', description: 'Shrimp, scallops, and crabmeat with mixed vegetables.', price_single: 16.95, category: "Chef's Specialties", included: 'White Rice' },

  // ==================== BEEF ====================
  { item_number: '57', name: 'Beef w. Bean Sprouts', description: 'Sliced beef stir-fried with crisp fresh bean sprouts.', price_small: 8.55, price_large: 12.95, category: 'Beef', included: 'White Rice' },
  { item_number: '58', name: 'Pepper Steak w. Onion', description: 'Tender beef with bell peppers and onions in savory sauce.', price_small: 8.55, price_large: 12.95, category: 'Beef', included: 'White Rice' },
  { item_number: '59', name: 'Beef w. Pepper & Tomato', description: 'Sliced beef with bell peppers and fresh tomatoes.', price_small: 8.55, price_large: 12.95, category: 'Beef', included: 'White Rice' },
  { item_number: '60', name: 'Beef w. Chinese Vegetables', description: 'Sliced beef with assorted Chinese vegetables.', price_small: 8.55, price_large: 12.95, category: 'Beef', included: 'White Rice' },
  { item_number: '61', name: 'Beef w. Mushrooms', description: 'Tender beef stir-fried with fresh mushrooms.', price_small: 8.55, price_large: 12.95, category: 'Beef', included: 'White Rice' },
  { item_number: '62', name: 'Beef w. Oyster Sauce', description: 'Sliced beef in rich savory oyster sauce.', price_small: 8.55, price_large: 12.95, category: 'Beef', included: 'White Rice' },
  { item_number: '63', name: 'Beef w. Snow Peas', description: 'Tender beef with crisp snow pea pods.', price_small: 8.55, price_large: 12.95, category: 'Beef', included: 'White Rice' },
  { item_number: '64', name: 'Beef w. Onion & Curry Sauce', description: 'Sliced beef with onions in aromatic curry sauce.', price_small: 8.55, price_large: 12.95, category: 'Beef', included: 'White Rice' },
  { item_number: '65', name: 'Beef w. Broccoli', description: 'Tender beef stir-fried with fresh broccoli florets.', price_small: 8.55, price_large: 12.95, category: 'Beef', included: 'White Rice' },
  { item_number: '66', name: 'Beef w. Bean Curd', description: 'Sliced beef with soft tofu in savory sauce.', price_small: 8.55, price_large: 12.95, category: 'Beef', included: 'White Rice' },
  { item_number: '66a', name: 'Beef w. Black Bean Sauce', description: 'Sliced beef in savory fermented black bean sauce.', price_small: 8.55, price_large: 12.95, category: 'Beef', included: 'White Rice' },
  { item_number: '67', name: 'Beef w. Cashew Nuts', description: 'Tender beef stir-fried with roasted cashews.', price_single: 12.95, category: 'Beef', included: 'White Rice' },

  // ==================== ROAST PORK ====================
  { item_number: '68', name: 'Roast Pork w. Bean Sprouts', description: 'Sliced roast pork stir-fried with crisp bean sprouts.', price_small: 8.15, price_large: 12.55, category: 'Roast Pork', included: 'White Rice' },
  { item_number: '69', name: 'Roast Pork w. Chinese Vegetables', description: 'Sliced roast pork with assorted Chinese vegetables.', price_small: 8.15, price_large: 12.55, category: 'Roast Pork', included: 'White Rice' },
  { item_number: '70', name: 'Roast Pork w. Mushrooms', description: 'Sliced roast pork stir-fried with fresh mushrooms.', price_small: 8.15, price_large: 12.55, category: 'Roast Pork', included: 'White Rice' },
  { item_number: '71', name: 'Roast Pork w. Snow Peas', description: 'Sliced roast pork with crisp snow pea pods.', price_small: 8.15, price_large: 12.55, category: 'Roast Pork', included: 'White Rice' },
  { item_number: '72', name: 'Roast Pork w. Bean Curd', description: 'Sliced roast pork with soft tofu in savory sauce.', price_small: 8.15, price_large: 12.55, category: 'Roast Pork', included: 'White Rice' },
  { item_number: '73', name: 'Roast Pork w. Oyster Sauce', description: 'Sliced roast pork in rich savory oyster sauce.', price_small: 8.15, price_large: 12.55, category: 'Roast Pork', included: 'White Rice' },
  { item_number: '74', name: 'Roast Pork w. Broccoli', description: 'Sliced roast pork stir-fried with fresh broccoli.', price_small: 8.15, price_large: 12.55, category: 'Roast Pork', included: 'White Rice' },

  // ==================== CHICKEN ====================
  { item_number: '75', name: 'Chicken w. Bean Curd', description: 'Tender chicken with soft tofu in savory sauce.', price_small: 8.15, price_large: 12.55, category: 'Chicken', included: 'White Rice' },
  { item_number: '76', name: 'Chicken w. Snow Peas', description: 'Diced chicken with crisp snow pea pods.', price_small: 8.15, price_large: 12.55, category: 'Chicken', included: 'White Rice' },
  { item_number: '77', name: 'Chicken w. Pepper & Tomato', description: 'Tender chicken with bell peppers and fresh tomatoes.', price_small: 8.15, price_large: 12.55, category: 'Chicken', included: 'White Rice' },
  { item_number: '78', name: 'Chicken w. Oyster Sauce', description: 'Diced chicken in rich savory oyster sauce.', price_small: 8.15, price_large: 12.55, category: 'Chicken', included: 'White Rice' },
  { item_number: '79', name: 'Chicken w. Onion & Curry Sauce', description: 'Tender chicken with onions in aromatic curry sauce.', price_small: 8.15, price_large: 12.55, category: 'Chicken', included: 'White Rice' },
  { item_number: '80', name: 'Moo Goo Gai Pan', description: 'Sliced chicken with mushrooms and vegetables in white sauce.', price_small: 8.15, price_large: 12.55, category: 'Chicken', included: 'White Rice' },
  { item_number: '81', name: 'Chicken w. Broccoli', description: 'Tender chicken stir-fried with fresh broccoli florets.', price_small: 8.15, price_large: 12.55, category: 'Chicken', included: 'White Rice' },
  { item_number: '81a', name: 'Chicken w. Black Bean Sauce', description: 'Diced chicken in savory fermented black bean sauce.', price_small: 8.15, price_large: 12.55, category: 'Chicken', included: 'White Rice' },
  { item_number: '82', name: 'Chicken w. Cashew Nuts', description: 'Tender chicken stir-fried with roasted cashews.', price_single: 12.55, category: 'Chicken', included: 'White Rice' },

  // ==================== SEAFOOD ====================
  { item_number: '83', name: 'Lobster Sauce', description: 'Savory egg-based sauce with ground pork, no lobster.', price_small: 4.50, price_large: 6.95, category: 'Seafood', included: 'White Rice' },
  { item_number: '84', name: 'Shrimp w. Bean Sprouts', description: 'Tender shrimp stir-fried with crisp bean sprouts.', price_small: 8.55, price_large: 13.35, category: 'Seafood', included: 'White Rice' },
  { item_number: '85', name: 'Shrimp w. Lobster Sauce', description: 'Tender shrimp in savory egg-based lobster sauce.', price_small: 8.55, price_large: 13.35, category: 'Seafood', included: 'White Rice' },
  { item_number: '86', name: 'Shrimp w. Chinese Vegetables', description: 'Tender shrimp with assorted Chinese vegetables.', price_small: 8.55, price_large: 13.35, category: 'Seafood', included: 'White Rice' },
  { item_number: '87', name: 'Shrimp w. Pepper & Tomato', description: 'Shrimp with bell peppers and fresh tomatoes.', price_small: 8.55, price_large: 13.35, category: 'Seafood', included: 'White Rice' },
  { item_number: '88', name: 'Shrimp w. Mushrooms', description: 'Tender shrimp stir-fried with fresh mushrooms.', price_small: 8.55, price_large: 13.35, category: 'Seafood', included: 'White Rice' },
  { item_number: '89', name: 'Shrimp w. Bean Curd', description: 'Tender shrimp with soft tofu in savory sauce.', price_small: 8.55, price_large: 13.35, category: 'Seafood', included: 'White Rice' },
  { item_number: '90', name: 'Shrimp w. Onion & Curry Sauce', description: 'Shrimp with onions in aromatic curry sauce.', price_small: 8.55, price_large: 13.35, category: 'Seafood', included: 'White Rice' },
  { item_number: '91', name: 'Shrimp w. Snow Peas', description: 'Tender shrimp with crisp snow pea pods.', price_small: 8.55, price_large: 13.35, category: 'Seafood', included: 'White Rice' },
  { item_number: '92', name: 'Shrimp w. Oyster Sauce', description: 'Tender shrimp in rich savory oyster sauce.', price_small: 8.55, price_large: 13.35, category: 'Seafood', included: 'White Rice' },
  { item_number: '93', name: 'Shrimp w. Broccoli', description: 'Tender shrimp stir-fried with fresh broccoli florets.', price_small: 8.55, price_large: 13.35, category: 'Seafood', included: 'White Rice' },
  { item_number: '93a', name: 'Shrimp w. Black Bean Sauce', description: 'Shrimp in savory fermented black bean sauce.', price_small: 8.55, price_large: 13.35, category: 'Seafood', included: 'White Rice' },
  { item_number: '94', name: 'Shrimp w. Cashew Nuts', description: 'Tender shrimp stir-fried with roasted cashews.', price_single: 13.35, category: 'Seafood', included: 'White Rice' },

  // ==================== EGG FOO YOUNG ====================
  { item_number: '95', name: 'Roast Pork Egg Foo Young', description: 'Fluffy egg omelette patties with roast pork and vegetables.', price_single: 11.15, category: 'Egg Foo Young', included: 'White Rice' },
  { item_number: '96', name: 'Shrimp Egg Foo Young', description: 'Fluffy egg omelette patties with shrimp and vegetables.', price_single: 11.95, category: 'Egg Foo Young', included: 'White Rice' },
  { item_number: '97', name: 'Chicken Egg Foo Young', description: 'Fluffy egg omelette patties with chicken and vegetables.', price_single: 11.15, category: 'Egg Foo Young', included: 'White Rice' },
  { item_number: '98', name: 'Vegetable Egg Foo Young', description: 'Fluffy egg omelette patties with mixed vegetables.', price_single: 10.95, category: 'Egg Foo Young', included: 'White Rice' },

  // ==================== SWEET & SOUR ====================
  { item_number: '99', name: 'Sweet & Sour Pork', description: 'Crispy battered pork chunks in tangy sweet and sour sauce.', price_single: 11.95, category: 'Sweet & Sour', included: 'White Rice' },
  { item_number: '100', name: 'Sweet & Sour Shrimp', description: 'Crispy battered shrimp in tangy sweet and sour sauce.', price_single: 12.95, category: 'Sweet & Sour', included: 'White Rice' },
  { item_number: '101', name: 'Sweet & Sour Chicken', description: 'Crispy battered chicken in tangy sweet and sour sauce.', price_single: 11.95, category: 'Sweet & Sour', included: 'White Rice' },

  // ==================== VEGETABLE DISHES ====================
  { item_number: '102', name: 'Sauteed Mixed Vegetable', description: 'Assorted fresh vegetables stir-fried in light sauce.', price_single: 10.75, category: 'Vegetable Dishes', included: 'White Rice' },
  { item_number: '103a', name: 'Mixed Vegetable w. Garlic Sauce', description: 'Assorted vegetables in savory brown garlic sauce.', price_single: 10.75, category: 'Vegetable Dishes', included: 'White Rice' },
  { item_number: '104', name: 'Broccoli w. Garlic Sauce', description: 'Fresh broccoli florets in savory brown garlic sauce.', price_single: 10.75, category: 'Vegetable Dishes', included: 'White Rice' },
  { item_number: '105a', name: 'Bean Curd Szechuan Style', description: 'Soft tofu in spicy Szechuan chili sauce.', price_single: 10.75, category: 'Vegetable Dishes', included: 'White Rice', is_spicy: 1 },
  { item_number: '106', name: 'Moo Shu Vegetable', description: 'Shredded vegetables with egg, served with pancakes.', price_single: 10.75, category: 'Vegetable Dishes', included: 'White Rice' },
  { item_number: '107', name: 'Bean Curd Home Style', description: 'Soft tofu braised in savory homestyle sauce.', price_single: 10.75, category: 'Vegetable Dishes', included: 'White Rice' },
  { item_number: '108', name: 'Bean Curd w. Brown Sauce', description: 'Soft tofu in rich savory brown sauce.', price_single: 10.75, category: 'Vegetable Dishes', included: 'White Rice' },
  { item_number: '110', name: 'Sesame Bean Curd', description: 'Crispy fried tofu coated in sweet sesame glaze.', price_single: 10.75, category: 'Vegetable Dishes', included: 'White Rice' },
  { item_number: '111', name: 'Bean Curd w. Garlic Sauce', description: 'Soft tofu in savory brown garlic sauce.', price_single: 10.75, category: 'Vegetable Dishes', included: 'White Rice' },

  // ==================== SPECIALTIES (A-Items) ====================
  { item_number: 'A1', name: 'Chicken Wing (4 pcs) or Half Chicken', description: 'Crispy fried chicken wings or half chicken, golden and juicy.', price_single: 7.75, category: 'Specialties', included: null },
  { item_number: 'A2', name: 'Spare Ribs Tips', description: 'Tender fried pork rib tips with sweet glaze.', price_small: 7.75, price_large: 11.95, category: 'Specialties', included: null },
  { item_number: 'A3', name: 'Fried Scallop', description: 'Lightly battered sea scallops fried until golden.', price_single: 6.25, category: 'Specialties', included: null },
  { item_number: 'A4', name: 'Fried Chicken Nuggets', description: 'Crispy bite-sized pieces of battered fried chicken.', price_single: 6.25, category: 'Specialties', included: null },
  { item_number: 'A5', name: 'Fried Crab Stick', description: 'Crispy battered imitation crab sticks.', price_single: 6.25, category: 'Specialties', included: null },
  { item_number: 'A6', name: 'Fried Chicken Wings w. Garlic Sauce', description: 'Crispy fried wings tossed in savory garlic sauce.', price_single: 8.75, category: 'Specialties', included: null },
  { item_number: 'A8', name: 'Fried Baby Shrimp', description: 'Small shrimp lightly battered and fried crispy.', price_single: 7.75, category: 'Specialties', included: null },

  // ==================== DIET MENU ====================
  { item_number: 'D1', name: 'Steamed Mixed Vegetable', description: 'Assorted vegetables steamed without oil or salt.', price_single: 10.75, category: 'Diet Menu', included: 'White Rice & Sauce on side' },
  { item_number: 'D2', name: 'Steamed Chicken w. Mixed Vegetables', description: 'Tender steamed chicken breast with assorted vegetables.', price_single: 12.55, category: 'Diet Menu', included: 'White Rice & Sauce on side' },
  { item_number: 'D3', name: 'Steamed Jumbo Shrimp w. Mixed Vegetable', description: 'Large steamed shrimp with assorted vegetables.', price_single: 13.35, category: 'Diet Menu', included: 'White Rice & Sauce on side' },
  { item_number: 'D4', name: 'Steamed Jumbo Shrimp & Chicken w. Mixed Vegetable', description: 'Steamed shrimp and chicken with assorted vegetables.', price_single: 13.95, category: 'Diet Menu', included: 'White Rice & Sauce on side' },
  { item_number: 'D5', name: 'Steamed Chicken Slices', description: 'Tender sliced chicken breast steamed plain.', price_single: 14.95, category: 'Diet Menu', included: 'White Rice & Sauce on side' },

  // ==================== COMBINATION PLATES ====================
  { item_number: 'CP1', name: 'Chicken Chow Mein Combo', description: 'Tender chicken with bean sprouts and vegetables.', price_single: 10.95, category: 'Combination Plates', included: 'Pork Fried Rice & Egg Roll' },
  { item_number: 'CP2', name: 'Shrimp w. Mixed Vegs Combo', description: 'Tender shrimp stir-fried with assorted vegetables.', price_single: 11.15, category: 'Combination Plates', included: 'Pork Fried Rice & Egg Roll' },
  { item_number: 'CP3', name: 'Pork or Chicken Egg Foo Young Combo', description: 'Fluffy egg omelette patties with pork or chicken.', price_single: 11.15, category: 'Combination Plates', included: 'Pork Fried Rice & Egg Roll' },
  { item_number: 'CP4', name: 'Pepper Steak Combo', description: 'Tender beef with bell peppers and onions.', price_single: 11.15, category: 'Combination Plates', included: 'Pork Fried Rice & Egg Roll' },
  { item_number: 'CP5', name: 'Roast Pork w. Chinese Veg Combo', description: 'Sliced roast pork with assorted Chinese vegetables.', price_single: 10.95, category: 'Combination Plates', included: 'Pork Fried Rice & Egg Roll' },
  { item_number: 'CP6', name: 'Shrimp w. Lobster Sauce Combo', description: 'Tender shrimp in savory egg-based lobster sauce.', price_single: 11.15, category: 'Combination Plates', included: 'Pork Fried Rice & Egg Roll' },
  { item_number: 'CP7', name: 'B-B-Q Spare Ribs or Boneless Combo', description: 'Tender pork ribs glazed with sweet BBQ sauce.', price_single: 11.55, category: 'Combination Plates', included: 'Pork Fried Rice & Egg Roll' },
  { item_number: 'CP8', name: 'Sweet & Sour Pork or Chicken Combo', description: 'Crispy battered meat in tangy sweet and sour sauce.', price_single: 10.95, category: 'Combination Plates', included: 'Pork Fried Rice & Egg Roll' },
  { item_number: 'CP9', name: 'Moo Goo Gai Pan Combo', description: 'Sliced chicken with mushrooms and vegetables.', price_single: 10.95, category: 'Combination Plates', included: 'Pork Fried Rice & Egg Roll' },
  { item_number: 'CP10', name: 'Chicken or Pork w. Garlic Sauce Combo', description: 'Tender meat in savory brown garlic sauce.', price_single: 10.95, category: 'Combination Plates', included: 'Pork Fried Rice & Egg Roll' },
  { item_number: 'CP11', name: 'Pork or Chicken w. Broccoli Combo', description: 'Tender meat stir-fried with fresh broccoli.', price_single: 10.95, category: 'Combination Plates', included: 'Pork Fried Rice & Egg Roll' },
  { item_number: 'CP12', name: 'Chicken or Pork Lo Mein Combo', description: 'Soft egg noodles stir-fried with meat and vegetables.', price_single: 10.95, category: 'Combination Plates', included: 'Pork Fried Rice & Egg Roll' },
  { item_number: 'CP13', name: "General Tso's Chicken Combo", description: 'Crispy chicken chunks in sweet and spicy chili glaze.', price_single: 11.15, category: 'Combination Plates', included: 'Pork Fried Rice & Egg Roll', is_spicy: 1 },
  { item_number: 'CP14', name: 'Sesame Chicken Combo', description: 'Crispy chicken chunks coated in sweet sesame glaze.', price_single: 11.15, category: 'Combination Plates', included: 'Pork Fried Rice & Egg Roll' },
  { item_number: 'CP15', name: 'Chicken w. Cashew Nuts Combo', description: 'Tender chicken stir-fried with roasted cashews.', price_single: 10.95, category: 'Combination Plates', included: 'Pork Fried Rice & Egg Roll' },
  { item_number: 'CP16', name: 'Shrimp or Beef w. Broccoli Combo', description: 'Tender shrimp or beef with fresh broccoli florets.', price_single: 11.15, category: 'Combination Plates', included: 'Pork Fried Rice & Egg Roll' },
  { item_number: 'CP17', name: 'Kung Pao Chicken Combo', description: 'Diced chicken stir-fried with peanuts and dried chilies.', price_single: 10.95, category: 'Combination Plates', included: 'Pork Fried Rice & Egg Roll', is_spicy: 1 },
  { item_number: 'CP18', name: 'Hunan or Szechuan Chicken Combo', description: 'Chicken in spicy regional chili sauce with vegetables.', price_single: 10.95, category: 'Combination Plates', included: 'Pork Fried Rice & Egg Roll', is_spicy: 1 },
  { item_number: 'CP19', name: 'Mixed Vegetable w. Garlic Sauce Combo', description: 'Assorted vegetables in savory brown garlic sauce.', price_single: 10.95, category: 'Combination Plates', included: 'Pork Fried Rice & Egg Roll' },
  { item_number: 'CP20', name: 'Triple Delight Combo', description: 'Shrimp, chicken, and pork with mixed vegetables.', price_single: 11.15, category: 'Combination Plates', included: 'Pork Fried Rice & Egg Roll' },
];

// Insert all items
const insertMany = db.transaction((items) => {
  for (const item of items) {
    insert.run({
      item_number: item.item_number,
      name: item.name,
      description: item.description,
      price_small: item.price_small || null,
      price_large: item.price_large || null,
      price_single: item.price_single || null,
      included: item.included || null,
      category: item.category,
      is_spicy: item.is_spicy || 0,
    });
  }
});

insertMany(menuItems);

console.log(`Database created: fareast.db`);
console.log(`Inserted ${menuItems.length} menu items`);


// ==================== ORDERS TABLE ====================
db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number    TEXT UNIQUE NOT NULL,
      phone_number    TEXT NOT NULL,
      status          TEXT DEFAULT 'pending',
      order_type      TEXT DEFAULT 'pickup',
      total           REAL,
      notes           TEXT,
      created_at      TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at      TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // ==================== ORDER ITEMS TABLE ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id        INTEGER NOT NULL,
      menu_item_id    INTEGER,
      item_name       TEXT NOT NULL,
      quantity        INTEGER DEFAULT 1,
      size            TEXT,
      unit_price      REAL NOT NULL,
      total           REAL NOT NULL,
      notes           TEXT,
      created_at      TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
    );
  `);
  
  // Add size column if it doesn't exist (for existing databases)
  try {
    db.exec(`ALTER TABLE order_items ADD COLUMN size TEXT`);
    console.log('Added size column to order_items');
  } catch (e) {
    // Column already exists, ignore
  }
  
  console.log('Created orders table');
  console.log('Created order_items table');
// Verify
const count = db.prepare('SELECT COUNT(*) as count FROM menu_items').get();
console.log(`Total items in database: ${count.count}`);



db.close();