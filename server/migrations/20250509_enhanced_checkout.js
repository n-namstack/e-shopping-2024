/**
 * Migration: Enhanced Checkout Features
 * Date: 2025-05-09
 * 
 * This migration adds tables to support:
 * - Saved addresses
 * - Saved payment methods
 * - One-click checkout
 */

exports.up = async function(knex) {
  // Create user_addresses table
  await knex.schema.createTable('user_addresses', table => {
    table.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary();
    table.uuid('user_id').notNullable().references('id').inTable('profiles').onDelete('CASCADE');
    table.string('name').notNullable();
    table.text('address').notNullable();
    table.string('city').notNullable();
    table.string('state');
    table.string('postal_code');
    table.string('country').notNullable();
    table.string('phone').notNullable();
    table.text('special_instructions');
    table.boolean('is_default').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Create user_payment_methods table
  await knex.schema.createTable('user_payment_methods', table => {
    table.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary();
    table.uuid('user_id').notNullable().references('id').inTable('profiles').onDelete('CASCADE');
    table.string('payment_type').notNullable(); // card, bank_account, mobile_money, etc.
    table.string('provider').notNullable(); // visa, mastercard, paypal, bank_name, etc.
    table.string('last_4_digits'); // Last 4 digits of card or account
    table.string('card_holder_name');
    table.string('expiry_date'); // For cards only
    table.jsonb('payment_details'); // Encrypted payment details
    table.boolean('is_default').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Create buy_now_pay_later_options table
  await knex.schema.createTable('buy_now_pay_later_options', table => {
    table.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary();
    table.string('provider_name').notNullable();
    table.string('display_name').notNullable();
    table.text('description');
    table.integer('min_amount').notNullable();
    table.integer('max_amount');
    table.integer('installments').notNullable();
    table.decimal('interest_rate', 5, 2).defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Add one_click_preference to profiles table
  await knex.schema.alterTable('profiles', table => {
    table.boolean('one_click_checkout_enabled').defaultTo(false);
    table.jsonb('checkout_preferences').defaultTo('{}');
  });
};

exports.down = async function(knex) {
  // Drop tables in reverse order
  await knex.schema.alterTable('profiles', table => {
    table.dropColumn('one_click_checkout_enabled');
    table.dropColumn('checkout_preferences');
  });
  
  await knex.schema.dropTableIfExists('buy_now_pay_later_options');
  await knex.schema.dropTableIfExists('user_payment_methods');
  await knex.schema.dropTableIfExists('user_addresses');
};
