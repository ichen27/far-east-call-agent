/**
 * API Route: /api/init
 *
 * POST - Reset database and seed menu items
 *        ?action=reset  -> Full reset (drops all data)
 *        ?action=seed   -> Only seed menu items (preserves orders)
 *
 * WARNING: reset action will delete ALL existing data!
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { resetDatabase, initializeDatabase, bulkInsertMenuItems, type MenuItem } from '../lib/db.js';

// Menu items from Far East Chinese Restaurant
// Source: SQLite database fareast.db
const MENU_ITEMS: MenuItem[] = [
  // Appetizers
  { menuItemId: '1', name: 'Vegetable Egg Roll', pintPrice: null, quartPrice: null, combinationPrice: 1.9, category: 'Appetizers' },
  { menuItemId: '2', name: 'Roast Pork Egg Roll', pintPrice: null, quartPrice: null, combinationPrice: 1.9, category: 'Appetizers' },
  { menuItemId: '3', name: 'Shrimp Egg Roll', pintPrice: null, quartPrice: null, combinationPrice: 2.0, category: 'Appetizers' },
  { menuItemId: '4', name: 'Vegetable Spring Roll', pintPrice: null, quartPrice: null, combinationPrice: 2.0, category: 'Appetizers' },
  { menuItemId: '5', name: 'Bar-B-Q Spare Ribs', pintPrice: 9.25, quartPrice: 17.35, combinationPrice: null, category: 'Appetizers' },
  { menuItemId: '6', name: 'Boneless Spare Ribs', pintPrice: 8.95, quartPrice: 16.35, combinationPrice: null, category: 'Appetizers' },
  { menuItemId: '7', name: 'Chinese Donut', pintPrice: null, quartPrice: null, combinationPrice: 6.25, category: 'Appetizers' },
  { menuItemId: '8', name: 'Fantail Shrimp', pintPrice: null, quartPrice: null, combinationPrice: 4.25, category: 'Appetizers' },
  { menuItemId: '9', name: 'Shrimp Toast', pintPrice: null, quartPrice: null, combinationPrice: 6.25, category: 'Appetizers' },
  { menuItemId: '10', name: 'Fried Wonton w. Sweet & Sour Sauce', pintPrice: null, quartPrice: null, combinationPrice: 6.25, category: 'Appetizers' },
  { menuItemId: '11', name: 'Wonton w. Sesame Sauce', pintPrice: null, quartPrice: null, combinationPrice: 7.25, category: 'Appetizers' },
  { menuItemId: '12', name: 'Dumplings', pintPrice: null, quartPrice: null, combinationPrice: 7.35, category: 'Appetizers' },
  { menuItemId: '13', name: 'Sesame Noodles', pintPrice: null, quartPrice: null, combinationPrice: 7.35, category: 'Appetizers' },
  { menuItemId: '14', name: 'Pu Pu Platter', pintPrice: null, quartPrice: null, combinationPrice: 15.95, category: 'Appetizers' },
  { menuItemId: '15', name: 'Teriyaki Chicken', pintPrice: null, quartPrice: null, combinationPrice: 6.95, category: 'Appetizers' },
  { menuItemId: '16', name: 'Fried Jumbo Shrimp', pintPrice: null, quartPrice: null, combinationPrice: 7.95, category: 'Appetizers' },
  { menuItemId: '17', name: 'Crab Rangoon', pintPrice: null, quartPrice: null, combinationPrice: 6.25, category: 'Appetizers' },
  { menuItemId: '18', name: 'French Fries', pintPrice: 3.35, quartPrice: 5.45, combinationPrice: null, category: 'Appetizers' },

  // Soup
  { menuItemId: '19', name: 'Wonton Soup', pintPrice: 3.35, quartPrice: 5.35, combinationPrice: null, category: 'Soup' },
  { menuItemId: '20', name: 'Egg Drop Soup', pintPrice: 3.35, quartPrice: 5.35, combinationPrice: null, category: 'Soup' },
  { menuItemId: '21', name: 'Chicken Rice Soup', pintPrice: 3.35, quartPrice: 5.35, combinationPrice: null, category: 'Soup' },
  { menuItemId: '22', name: 'Chicken Noodles Soup', pintPrice: 3.35, quartPrice: 5.35, combinationPrice: null, category: 'Soup' },
  { menuItemId: '23', name: 'Pork Yat Gaw Mein', pintPrice: null, quartPrice: null, combinationPrice: 5.95, category: 'Soup' },
  { menuItemId: '24', name: 'Wonton Egg Drop Soup', pintPrice: 3.95, quartPrice: 5.95, combinationPrice: null, category: 'Soup' },
  { menuItemId: '25', name: 'Hot & Sour Soup', pintPrice: 3.95, quartPrice: 5.95, combinationPrice: null, category: 'Soup' },
  { menuItemId: '26', name: 'Fried Wonton Soup', pintPrice: null, quartPrice: 7.35, combinationPrice: null, category: 'Soup' },
  { menuItemId: '27', name: 'Veg. w. Bean Curd Soup', pintPrice: null, quartPrice: 5.95, combinationPrice: null, category: 'Soup' },
  { menuItemId: '27a', name: 'House Special Mei Fun Soup', pintPrice: null, quartPrice: 7.35, combinationPrice: null, category: 'Soup' },
  { menuItemId: '27b', name: 'House Special Chow Fun Soup', pintPrice: null, quartPrice: 7.35, combinationPrice: null, category: 'Soup' },
  { menuItemId: '27c', name: 'House Special Soup', pintPrice: null, quartPrice: 7.35, combinationPrice: null, category: 'Soup' },

  // Chow Mein
  { menuItemId: '28', name: 'Chicken Chow Mein', pintPrice: 7.35, quartPrice: 10.55, combinationPrice: null, category: 'Chow Mein' },
  { menuItemId: '29', name: 'Roast Pork Chow Mein', pintPrice: 7.35, quartPrice: 10.55, combinationPrice: null, category: 'Chow Mein' },
  { menuItemId: '30', name: 'Mixed Vegetable Chow Mein', pintPrice: 6.95, quartPrice: 10.15, combinationPrice: null, category: 'Chow Mein' },
  { menuItemId: '31', name: 'Beef Chow Mein', pintPrice: 7.95, quartPrice: 11.15, combinationPrice: null, category: 'Chow Mein' },
  { menuItemId: '32', name: 'Shrimp Chow Mein', pintPrice: 7.95, quartPrice: 11.15, combinationPrice: null, category: 'Chow Mein' },
  { menuItemId: '33', name: 'Special Chow Mein', pintPrice: 7.95, quartPrice: 11.15, combinationPrice: null, category: 'Chow Mein' },

  // Chow Fun / Mei Fun
  { menuItemId: '34', name: 'Roast Pork Chow Fun or Mei Fun', pintPrice: null, quartPrice: null, combinationPrice: 10.55, category: 'Chow Fun / Mei Fun' },
  { menuItemId: '35', name: 'Chicken Chow Fun or Mei Fun', pintPrice: null, quartPrice: null, combinationPrice: 10.55, category: 'Chow Fun / Mei Fun' },
  { menuItemId: '36', name: 'Beef Chow Fun or Mei Fun', pintPrice: null, quartPrice: null, combinationPrice: 10.95, category: 'Chow Fun / Mei Fun' },
  { menuItemId: '37', name: 'Shrimp Chow Fun or Mei Fun', pintPrice: null, quartPrice: null, combinationPrice: 10.95, category: 'Chow Fun / Mei Fun' },
  { menuItemId: '38', name: 'Special Chow Fun or Mei Fun', pintPrice: null, quartPrice: null, combinationPrice: 11.55, category: 'Chow Fun / Mei Fun' },
  { menuItemId: '39', name: 'Vegetable Chow Fun or Mei Fun', pintPrice: null, quartPrice: null, combinationPrice: 10.15, category: 'Chow Fun / Mei Fun' },
  { menuItemId: '39a', name: 'Singapore Mei Fun', pintPrice: null, quartPrice: null, combinationPrice: 11.55, category: 'Chow Fun / Mei Fun' },

  // Chop Suey
  { menuItemId: '40', name: 'Mixed Vegetable Chop Suey', pintPrice: 6.95, quartPrice: 10.15, combinationPrice: null, category: 'Chop Suey' },
  { menuItemId: '41', name: 'Roast Pork Chop Suey', pintPrice: 7.35, quartPrice: 10.55, combinationPrice: null, category: 'Chop Suey' },
  { menuItemId: '42', name: 'Beef Chop Suey', pintPrice: 7.95, quartPrice: 11.15, combinationPrice: null, category: 'Chop Suey' },
  { menuItemId: '43', name: 'Shrimp Chop Suey', pintPrice: 7.95, quartPrice: 11.15, combinationPrice: null, category: 'Chop Suey' },
  { menuItemId: '44', name: 'Chicken Chop Suey', pintPrice: 7.35, quartPrice: 10.55, combinationPrice: null, category: 'Chop Suey' },
  { menuItemId: '45', name: 'Special Chop Suey', pintPrice: 7.95, quartPrice: 10.95, combinationPrice: null, category: 'Chop Suey' },

  // Fried Rice
  { menuItemId: '46', name: 'Vegetable Fried Rice', pintPrice: 5.55, quartPrice: 9.55, combinationPrice: null, category: 'Fried Rice' },
  { menuItemId: '47', name: 'Roast Pork Fried Rice', pintPrice: 5.95, quartPrice: 9.95, combinationPrice: null, category: 'Fried Rice' },
  { menuItemId: '48', name: 'Shrimp Fried Rice', pintPrice: 6.75, quartPrice: 10.55, combinationPrice: null, category: 'Fried Rice' },
  { menuItemId: '49', name: 'Chicken Fried Rice', pintPrice: 5.95, quartPrice: 9.95, combinationPrice: null, category: 'Fried Rice' },
  { menuItemId: '49a', name: 'Beef Fried Rice', pintPrice: 6.75, quartPrice: 10.55, combinationPrice: null, category: 'Fried Rice' },
  { menuItemId: '50', name: 'House Special Fried Rice', pintPrice: 6.95, quartPrice: 10.95, combinationPrice: null, category: 'Fried Rice' },

  // Lo Mein
  { menuItemId: '51', name: 'Vegetable Lo Mein', pintPrice: 7.25, quartPrice: 10.75, combinationPrice: null, category: 'Lo Mein' },
  { menuItemId: '52', name: 'Roast Pork Lo Mein', pintPrice: 7.75, quartPrice: 10.95, combinationPrice: null, category: 'Lo Mein' },
  { menuItemId: '53', name: 'Beef Lo Mein', pintPrice: 7.95, quartPrice: 11.55, combinationPrice: null, category: 'Lo Mein' },
  { menuItemId: '54', name: 'Chicken Lo Mein', pintPrice: 7.75, quartPrice: 10.95, combinationPrice: null, category: 'Lo Mein' },
  { menuItemId: '55', name: 'Shrimp Lo Mein', pintPrice: 7.95, quartPrice: 11.55, combinationPrice: null, category: 'Lo Mein' },
  { menuItemId: '56', name: 'Special Lo Mein', pintPrice: 8.25, quartPrice: 11.95, combinationPrice: null, category: 'Lo Mein' },

  // Side Order
  { menuItemId: 'S1', name: 'White Rice', pintPrice: 3.0, quartPrice: 4.0, combinationPrice: null, category: 'Side Order' },
  { menuItemId: 'S2', name: 'Fortune Cookie', pintPrice: null, quartPrice: null, combinationPrice: 1.0, category: 'Side Order' },
  { menuItemId: 'S3', name: 'Soda (Can)', pintPrice: null, quartPrice: null, combinationPrice: 1.3, category: 'Side Order' },
  { menuItemId: 'S4', name: 'Crispy Noodle', pintPrice: null, quartPrice: null, combinationPrice: 1.0, category: 'Side Order' },
  { menuItemId: 'S5', name: 'Homemade Iced Tea', pintPrice: null, quartPrice: null, combinationPrice: 2.5, category: 'Side Order' },

  // Chef's Specialties
  { menuItemId: 'C1', name: 'Jumbo Shrimp or Beef Szechuan Style', pintPrice: null, quartPrice: null, combinationPrice: 13.35, category: "Chef's Specialties" },
  { menuItemId: 'C2', name: 'Pork or Chicken Szechuan Style', pintPrice: null, quartPrice: null, combinationPrice: 12.55, category: "Chef's Specialties" },
  { menuItemId: 'C3', name: 'Crispy Shrimp', pintPrice: null, quartPrice: null, combinationPrice: 13.95, category: "Chef's Specialties" },
  { menuItemId: 'C4', name: 'Jumbo Shrimp or Beef Hunan Style', pintPrice: null, quartPrice: null, combinationPrice: 13.35, category: "Chef's Specialties" },
  { menuItemId: 'C5', name: 'Pork or Chicken Hunan Style', pintPrice: null, quartPrice: null, combinationPrice: 12.55, category: "Chef's Specialties" },
  { menuItemId: 'C6', name: 'Moo Shu Pork or Chicken', pintPrice: null, quartPrice: null, combinationPrice: 12.55, category: "Chef's Specialties" },
  { menuItemId: 'C7', name: 'Moo Shu Shrimp or Beef', pintPrice: null, quartPrice: null, combinationPrice: 13.35, category: "Chef's Specialties" },
  { menuItemId: 'C8', name: 'Kung Po Chicken', pintPrice: null, quartPrice: null, combinationPrice: 12.55, category: "Chef's Specialties" },
  { menuItemId: 'C9', name: 'Kung Po Shrimp or Beef', pintPrice: null, quartPrice: null, combinationPrice: 13.35, category: "Chef's Specialties" },
  { menuItemId: 'C10', name: 'Beef w. Garlic Sauce', pintPrice: null, quartPrice: null, combinationPrice: 13.35, category: "Chef's Specialties" },
  { menuItemId: 'C11', name: 'Pork or Chicken w. Garlic Sauce', pintPrice: null, quartPrice: null, combinationPrice: 12.55, category: "Chef's Specialties" },
  { menuItemId: 'C12', name: 'Shrimp w. Garlic Sauce', pintPrice: null, quartPrice: null, combinationPrice: 13.35, category: "Chef's Specialties" },
  { menuItemId: 'C13', name: 'Sun See w. Garlic Sauce', pintPrice: null, quartPrice: null, combinationPrice: 13.75, category: "Chef's Specialties" },
  { menuItemId: 'C14', name: 'Hot & Spicy Shrimp', pintPrice: null, quartPrice: null, combinationPrice: 13.35, category: "Chef's Specialties" },
  { menuItemId: 'C15', name: 'Sesame Beef or Orange Beef', pintPrice: null, quartPrice: null, combinationPrice: 13.95, category: "Chef's Specialties" },
  { menuItemId: 'C16', name: "General Tso's Chicken", pintPrice: null, quartPrice: null, combinationPrice: 12.95, category: "Chef's Specialties" },
  { menuItemId: 'C17', name: 'Pork or Beef w. Scallion Sauce', pintPrice: null, quartPrice: null, combinationPrice: 12.95, category: "Chef's Specialties" },
  { menuItemId: 'C18', name: 'Scallops w. Garlic Sauce', pintPrice: null, quartPrice: null, combinationPrice: 13.35, category: "Chef's Specialties" },
  { menuItemId: 'C19', name: 'Sesame Chicken', pintPrice: null, quartPrice: null, combinationPrice: 12.95, category: "Chef's Specialties" },
  { menuItemId: 'C20', name: 'Crispy Chicken w. Orange Flavor', pintPrice: null, quartPrice: null, combinationPrice: 12.95, category: "Chef's Specialties" },
  { menuItemId: 'C21', name: 'Shrimp & Scallops Hunan Style', pintPrice: null, quartPrice: null, combinationPrice: 13.95, category: "Chef's Specialties" },
  { menuItemId: 'C22', name: 'Beef & Scallops Hunan Style', pintPrice: null, quartPrice: null, combinationPrice: 13.95, category: "Chef's Specialties" },
  { menuItemId: 'C23', name: 'Three Delights', pintPrice: null, quartPrice: null, combinationPrice: 13.75, category: "Chef's Specialties" },
  { menuItemId: 'C24', name: 'Four Seasons', pintPrice: null, quartPrice: null, combinationPrice: 13.95, category: "Chef's Specialties" },
  { menuItemId: 'C25', name: 'Happy Family', pintPrice: null, quartPrice: null, combinationPrice: 16.95, category: "Chef's Specialties" },
  { menuItemId: 'C26', name: 'Tung-Ting Shrimp', pintPrice: null, quartPrice: null, combinationPrice: 13.35, category: "Chef's Specialties" },
  { menuItemId: 'C27', name: 'Chicken w. Baby Shrimp', pintPrice: null, quartPrice: null, combinationPrice: 12.95, category: "Chef's Specialties" },
  { menuItemId: 'C28', name: 'Dragon & Phoenix', pintPrice: null, quartPrice: null, combinationPrice: 13.95, category: "Chef's Specialties" },
  { menuItemId: 'C29', name: 'Lemon Chicken', pintPrice: null, quartPrice: null, combinationPrice: 11.95, category: "Chef's Specialties" },
  { menuItemId: 'C30', name: 'Subgum Wonton', pintPrice: null, quartPrice: null, combinationPrice: 13.95, category: "Chef's Specialties" },
  { menuItemId: 'C31', name: 'Butterfly Shrimp w. Bacon', pintPrice: null, quartPrice: null, combinationPrice: 13.95, category: "Chef's Specialties" },
  { menuItemId: 'C32', name: 'Wor Shu Duck', pintPrice: null, quartPrice: null, combinationPrice: 15.95, category: "Chef's Specialties" },
  { menuItemId: 'C33', name: 'Special Duck', pintPrice: null, quartPrice: null, combinationPrice: 17.95, category: "Chef's Specialties" },
  { menuItemId: 'C34', name: 'Seafood Delight', pintPrice: null, quartPrice: null, combinationPrice: 16.95, category: "Chef's Specialties" },

  // Beef
  { menuItemId: '57', name: 'Beef w. Bean Sprouts', pintPrice: 8.55, quartPrice: 12.95, combinationPrice: null, category: 'Beef' },
  { menuItemId: '58', name: 'Pepper Steak w. Onion', pintPrice: 8.55, quartPrice: 12.95, combinationPrice: null, category: 'Beef' },
  { menuItemId: '59', name: 'Beef w. Pepper & Tomato', pintPrice: 8.55, quartPrice: 12.95, combinationPrice: null, category: 'Beef' },
  { menuItemId: '60', name: 'Beef w. Chinese Vegetables', pintPrice: 8.55, quartPrice: 12.95, combinationPrice: null, category: 'Beef' },
  { menuItemId: '61', name: 'Beef w. Mushrooms', pintPrice: 8.55, quartPrice: 12.95, combinationPrice: null, category: 'Beef' },
  { menuItemId: '62', name: 'Beef w. Oyster Sauce', pintPrice: 8.55, quartPrice: 12.95, combinationPrice: null, category: 'Beef' },
  { menuItemId: '63', name: 'Beef w. Snow Peas', pintPrice: 8.55, quartPrice: 12.95, combinationPrice: null, category: 'Beef' },
  { menuItemId: '64', name: 'Beef w. Onion & Curry Sauce', pintPrice: 8.55, quartPrice: 12.95, combinationPrice: null, category: 'Beef' },
  { menuItemId: '65', name: 'Beef w. Broccoli', pintPrice: 8.55, quartPrice: 12.95, combinationPrice: null, category: 'Beef' },
  { menuItemId: '66', name: 'Beef w. Bean Curd', pintPrice: 8.55, quartPrice: 12.95, combinationPrice: null, category: 'Beef' },
  { menuItemId: '66a', name: 'Beef w. Black Bean Sauce', pintPrice: 8.55, quartPrice: 12.95, combinationPrice: null, category: 'Beef' },
  { menuItemId: '67', name: 'Beef w. Cashew Nuts', pintPrice: null, quartPrice: null, combinationPrice: 12.95, category: 'Beef' },

  // Roast Pork
  { menuItemId: '68', name: 'Roast Pork w. Bean Sprouts', pintPrice: 8.15, quartPrice: 12.55, combinationPrice: null, category: 'Roast Pork' },
  { menuItemId: '69', name: 'Roast Pork w. Chinese Vegetables', pintPrice: 8.15, quartPrice: 12.55, combinationPrice: null, category: 'Roast Pork' },
  { menuItemId: '70', name: 'Roast Pork w. Mushrooms', pintPrice: 8.15, quartPrice: 12.55, combinationPrice: null, category: 'Roast Pork' },
  { menuItemId: '71', name: 'Roast Pork w. Snow Peas', pintPrice: 8.15, quartPrice: 12.55, combinationPrice: null, category: 'Roast Pork' },
  { menuItemId: '72', name: 'Roast Pork w. Bean Curd', pintPrice: 8.15, quartPrice: 12.55, combinationPrice: null, category: 'Roast Pork' },
  { menuItemId: '73', name: 'Roast Pork w. Oyster Sauce', pintPrice: 8.15, quartPrice: 12.55, combinationPrice: null, category: 'Roast Pork' },
  { menuItemId: '74', name: 'Roast Pork w. Broccoli', pintPrice: 8.15, quartPrice: 12.55, combinationPrice: null, category: 'Roast Pork' },

  // Chicken
  { menuItemId: '75', name: 'Chicken w. Bean Curd', pintPrice: 8.15, quartPrice: 12.55, combinationPrice: null, category: 'Chicken' },
  { menuItemId: '76', name: 'Chicken w. Snow Peas', pintPrice: 8.15, quartPrice: 12.55, combinationPrice: null, category: 'Chicken' },
  { menuItemId: '77', name: 'Chicken w. Pepper & Tomato', pintPrice: 8.15, quartPrice: 12.55, combinationPrice: null, category: 'Chicken' },
  { menuItemId: '78', name: 'Chicken w. Oyster Sauce', pintPrice: 8.15, quartPrice: 12.55, combinationPrice: null, category: 'Chicken' },
  { menuItemId: '79', name: 'Chicken w. Onion & Curry Sauce', pintPrice: 8.15, quartPrice: 12.55, combinationPrice: null, category: 'Chicken' },
  { menuItemId: '80', name: 'Moo Goo Gai Pan', pintPrice: 8.15, quartPrice: 12.55, combinationPrice: null, category: 'Chicken' },
  { menuItemId: '81', name: 'Chicken w. Broccoli', pintPrice: 8.15, quartPrice: 12.55, combinationPrice: null, category: 'Chicken' },
  { menuItemId: '81a', name: 'Chicken w. Black Bean Sauce', pintPrice: 8.15, quartPrice: 12.55, combinationPrice: null, category: 'Chicken' },
  { menuItemId: '82', name: 'Chicken w. Cashew Nuts', pintPrice: null, quartPrice: null, combinationPrice: 12.55, category: 'Chicken' },

  // Seafood
  { menuItemId: '83', name: 'Lobster Sauce', pintPrice: 4.5, quartPrice: 6.95, combinationPrice: null, category: 'Seafood' },
  { menuItemId: '84', name: 'Shrimp w. Bean Sprouts', pintPrice: 8.55, quartPrice: 13.35, combinationPrice: null, category: 'Seafood' },
  { menuItemId: '85', name: 'Shrimp w. Lobster Sauce', pintPrice: 8.55, quartPrice: 13.35, combinationPrice: null, category: 'Seafood' },
  { menuItemId: '86', name: 'Shrimp w. Chinese Vegetables', pintPrice: 8.55, quartPrice: 13.35, combinationPrice: null, category: 'Seafood' },
  { menuItemId: '87', name: 'Shrimp w. Pepper & Tomato', pintPrice: 8.55, quartPrice: 13.35, combinationPrice: null, category: 'Seafood' },
  { menuItemId: '88', name: 'Shrimp w. Mushrooms', pintPrice: 8.55, quartPrice: 13.35, combinationPrice: null, category: 'Seafood' },
  { menuItemId: '89', name: 'Shrimp w. Bean Curd', pintPrice: 8.55, quartPrice: 13.35, combinationPrice: null, category: 'Seafood' },
  { menuItemId: '90', name: 'Shrimp w. Onion & Curry Sauce', pintPrice: 8.55, quartPrice: 13.35, combinationPrice: null, category: 'Seafood' },
  { menuItemId: '91', name: 'Shrimp w. Snow Peas', pintPrice: 8.55, quartPrice: 13.35, combinationPrice: null, category: 'Seafood' },
  { menuItemId: '92', name: 'Shrimp w. Oyster Sauce', pintPrice: 8.55, quartPrice: 13.35, combinationPrice: null, category: 'Seafood' },
  { menuItemId: '93', name: 'Shrimp w. Broccoli', pintPrice: 8.55, quartPrice: 13.35, combinationPrice: null, category: 'Seafood' },
  { menuItemId: '93a', name: 'Shrimp w. Black Bean Sauce', pintPrice: 8.55, quartPrice: 13.35, combinationPrice: null, category: 'Seafood' },
  { menuItemId: '94', name: 'Shrimp w. Cashew Nuts', pintPrice: null, quartPrice: null, combinationPrice: 13.35, category: 'Seafood' },

  // Egg Foo Young
  { menuItemId: '95', name: 'Roast Pork Egg Foo Young', pintPrice: null, quartPrice: null, combinationPrice: 11.15, category: 'Egg Foo Young' },
  { menuItemId: '96', name: 'Shrimp Egg Foo Young', pintPrice: null, quartPrice: null, combinationPrice: 11.95, category: 'Egg Foo Young' },
  { menuItemId: '97', name: 'Chicken Egg Foo Young', pintPrice: null, quartPrice: null, combinationPrice: 11.15, category: 'Egg Foo Young' },
  { menuItemId: '98', name: 'Vegetable Egg Foo Young', pintPrice: null, quartPrice: null, combinationPrice: 10.95, category: 'Egg Foo Young' },

  // Sweet & Sour
  { menuItemId: '99', name: 'Sweet & Sour Pork', pintPrice: null, quartPrice: null, combinationPrice: 11.95, category: 'Sweet & Sour' },
  { menuItemId: '100', name: 'Sweet & Sour Shrimp', pintPrice: null, quartPrice: null, combinationPrice: 12.95, category: 'Sweet & Sour' },
  { menuItemId: '101', name: 'Sweet & Sour Chicken', pintPrice: null, quartPrice: null, combinationPrice: 11.95, category: 'Sweet & Sour' },

  // Vegetable Dishes
  { menuItemId: '102', name: 'Sauteed Mixed Vegetable', pintPrice: null, quartPrice: null, combinationPrice: 10.75, category: 'Vegetable Dishes' },
  { menuItemId: '103a', name: 'Mixed Vegetable w. Garlic Sauce', pintPrice: null, quartPrice: null, combinationPrice: 10.75, category: 'Vegetable Dishes' },
  { menuItemId: '104', name: 'Broccoli w. Garlic Sauce', pintPrice: null, quartPrice: null, combinationPrice: 10.75, category: 'Vegetable Dishes' },
  { menuItemId: '105a', name: 'Bean Curd Szechuan Style', pintPrice: null, quartPrice: null, combinationPrice: 10.75, category: 'Vegetable Dishes' },
  { menuItemId: '106', name: 'Moo Shu Vegetable', pintPrice: null, quartPrice: null, combinationPrice: 10.75, category: 'Vegetable Dishes' },
  { menuItemId: '107', name: 'Bean Curd Home Style', pintPrice: null, quartPrice: null, combinationPrice: 10.75, category: 'Vegetable Dishes' },
  { menuItemId: '108', name: 'Bean Curd w. Brown Sauce', pintPrice: null, quartPrice: null, combinationPrice: 10.75, category: 'Vegetable Dishes' },
  { menuItemId: '110', name: 'Sesame Bean Curd', pintPrice: null, quartPrice: null, combinationPrice: 10.75, category: 'Vegetable Dishes' },
  { menuItemId: '111', name: 'Bean Curd w. Garlic Sauce', pintPrice: null, quartPrice: null, combinationPrice: 10.75, category: 'Vegetable Dishes' },

  // Specialties
  { menuItemId: 'A1', name: 'Chicken Wing (4 pcs) or Half Chicken', pintPrice: null, quartPrice: null, combinationPrice: 7.75, category: 'Specialties' },
  { menuItemId: 'A2', name: 'Spare Ribs Tips', pintPrice: 7.75, quartPrice: 11.95, combinationPrice: null, category: 'Specialties' },
  { menuItemId: 'A3', name: 'Fried Scallop', pintPrice: null, quartPrice: null, combinationPrice: 6.25, category: 'Specialties' },
  { menuItemId: 'A4', name: 'Fried Chicken Nuggets', pintPrice: null, quartPrice: null, combinationPrice: 6.25, category: 'Specialties' },
  { menuItemId: 'A5', name: 'Fried Crab Stick', pintPrice: null, quartPrice: null, combinationPrice: 6.25, category: 'Specialties' },
  { menuItemId: 'A6', name: 'Fried Chicken Wings w. Garlic Sauce', pintPrice: null, quartPrice: null, combinationPrice: 8.75, category: 'Specialties' },
  { menuItemId: 'A8', name: 'Fried Baby Shrimp', pintPrice: null, quartPrice: null, combinationPrice: 7.75, category: 'Specialties' },

  // Diet Menu
  { menuItemId: 'D1', name: 'Steamed Mixed Vegetable', pintPrice: null, quartPrice: null, combinationPrice: 10.75, category: 'Diet Menu' },
  { menuItemId: 'D2', name: 'Steamed Chicken w. Mixed Vegetables', pintPrice: null, quartPrice: null, combinationPrice: 12.55, category: 'Diet Menu' },
  { menuItemId: 'D3', name: 'Steamed Jumbo Shrimp w. Mixed Vegetable', pintPrice: null, quartPrice: null, combinationPrice: 13.35, category: 'Diet Menu' },
  { menuItemId: 'D4', name: 'Steamed Jumbo Shrimp & Chicken w. Mixed Vegetable', pintPrice: null, quartPrice: null, combinationPrice: 13.95, category: 'Diet Menu' },
  { menuItemId: 'D5', name: 'Steamed Chicken Slices', pintPrice: null, quartPrice: null, combinationPrice: 14.95, category: 'Diet Menu' },

  // Combination Plates
  { menuItemId: 'CP1', name: 'Chicken Chow Mein Combo', pintPrice: null, quartPrice: null, combinationPrice: 10.95, category: 'Combination Plates' },
  { menuItemId: 'CP2', name: 'Shrimp w. Mixed Vegs Combo', pintPrice: null, quartPrice: null, combinationPrice: 11.15, category: 'Combination Plates' },
  { menuItemId: 'CP3', name: 'Pork or Chicken Egg Foo Young Combo', pintPrice: null, quartPrice: null, combinationPrice: 11.15, category: 'Combination Plates' },
  { menuItemId: 'CP4', name: 'Pepper Steak Combo', pintPrice: null, quartPrice: null, combinationPrice: 11.15, category: 'Combination Plates' },
  { menuItemId: 'CP5', name: 'Roast Pork w. Chinese Veg Combo', pintPrice: null, quartPrice: null, combinationPrice: 10.95, category: 'Combination Plates' },
  { menuItemId: 'CP6', name: 'Shrimp w. Lobster Sauce Combo', pintPrice: null, quartPrice: null, combinationPrice: 11.15, category: 'Combination Plates' },
  { menuItemId: 'CP7', name: 'B-B-Q Spare Ribs or Boneless Combo', pintPrice: null, quartPrice: null, combinationPrice: 11.55, category: 'Combination Plates' },
  { menuItemId: 'CP8', name: 'Sweet & Sour Pork or Chicken Combo', pintPrice: null, quartPrice: null, combinationPrice: 10.95, category: 'Combination Plates' },
  { menuItemId: 'CP9', name: 'Moo Goo Gai Pan Combo', pintPrice: null, quartPrice: null, combinationPrice: 10.95, category: 'Combination Plates' },
  { menuItemId: 'CP10', name: 'Chicken or Pork w. Garlic Sauce Combo', pintPrice: null, quartPrice: null, combinationPrice: 10.95, category: 'Combination Plates' },
  { menuItemId: 'CP11', name: 'Pork or Chicken w. Broccoli Combo', pintPrice: null, quartPrice: null, combinationPrice: 10.95, category: 'Combination Plates' },
  { menuItemId: 'CP12', name: 'Chicken or Pork Lo Mein Combo', pintPrice: null, quartPrice: null, combinationPrice: 10.95, category: 'Combination Plates' },
  { menuItemId: 'CP13', name: "General Tso's Chicken Combo", pintPrice: null, quartPrice: null, combinationPrice: 11.15, category: 'Combination Plates' },
  { menuItemId: 'CP14', name: 'Sesame Chicken Combo', pintPrice: null, quartPrice: null, combinationPrice: 11.15, category: 'Combination Plates' },
  { menuItemId: 'CP15', name: 'Chicken w. Cashew Nuts Combo', pintPrice: null, quartPrice: null, combinationPrice: 10.95, category: 'Combination Plates' },
  { menuItemId: 'CP16', name: 'Shrimp or Beef w. Broccoli Combo', pintPrice: null, quartPrice: null, combinationPrice: 11.15, category: 'Combination Plates' },
  { menuItemId: 'CP17', name: 'Kung Pao Chicken Combo', pintPrice: null, quartPrice: null, combinationPrice: 10.95, category: 'Combination Plates' },
  { menuItemId: 'CP18', name: 'Hunan or Szechuan Chicken Combo', pintPrice: null, quartPrice: null, combinationPrice: 10.95, category: 'Combination Plates' },
  { menuItemId: 'CP19', name: 'Mixed Vegetable w. Garlic Sauce Combo', pintPrice: null, quartPrice: null, combinationPrice: 10.95, category: 'Combination Plates' },
  { menuItemId: 'CP20', name: 'Triple Delight Combo', pintPrice: null, quartPrice: null, combinationPrice: 11.15, category: 'Combination Plates' },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST to initialize.',
    });
  }

  const { action } = req.query;

  try {
    if (action === 'reset') {
      // Full reset - drops all tables and recreates them
      console.log('[API] Performing full database reset...');
      await resetDatabase();

      // Seed menu items
      console.log('[API] Seeding menu items...');
      const count = await bulkInsertMenuItems(MENU_ITEMS);

      return res.status(200).json({
        success: true,
        message: `Database reset complete. Seeded ${count} menu items.`,
        menuItemCount: count,
      });
    } else if (action === 'seed') {
      // Only seed menu items (preserves existing orders)
      console.log('[API] Seeding menu items...');
      const count = await bulkInsertMenuItems(MENU_ITEMS);

      return res.status(200).json({
        success: true,
        message: `Seeded ${count} menu items.`,
        menuItemCount: count,
      });
    } else {
      // Default: just initialize tables (no data modification)
      await initializeDatabase();

      return res.status(200).json({
        success: true,
        message: 'Database tables initialized. Use ?action=reset for full reset or ?action=seed to add menu items.',
      });
    }
  } catch (error) {
    console.error('[API] Database initialization error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to initialize database',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
