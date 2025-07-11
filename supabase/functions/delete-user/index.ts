import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== DELETE USER FUNCTION STARTED ===')
    console.log('Request method:', req.method)
    console.log('Request headers:', Object.fromEntries(req.headers.entries()))

    // Create a Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('Supabase URL:', supabaseUrl ? 'Present' : 'Missing')
    console.log('Service key:', supabaseServiceKey ? 'Present' : 'Missing')

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get the user from the Authorization header
    const authHeader = req.headers.get('Authorization')
    console.log('Authorization header:', authHeader ? 'Present' : 'Missing')
    
    if (!authHeader) {
      console.error('No authorization header provided')
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the user token
    const token = authHeader.replace('Bearer ', '')
    console.log('Token length:', token.length)
    
    console.log('Verifying user token...')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError) {
      console.error('Token verification error:', userError)
      return new Response(
        JSON.stringify({ error: 'Invalid token', details: userError.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!user) {
      console.error('No user found with token')
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id
    console.log('Successfully verified user:', userId)
    console.log('User email:', user.email)

    try {
      console.log('=== STARTING DATABASE CLEANUP ===')
      
      // 1. Get user's shop IDs for cascade deletions
      console.log('Fetching user shops...')
      const { data: userShops, error: shopsError } = await supabaseAdmin
        .from('shops')
        .select('id')
        .eq('owner_id', userId)
      
      if (shopsError) {
        console.error('Error fetching shops:', shopsError)
      }
      
      const shopIds = userShops?.map(shop => shop.id) || []
      console.log('Found shops:', shopIds)

      // 2. Delete in proper order to avoid foreign key violations
      
      // Delete notifications first (if table exists)
      console.log('Deleting notifications...')
      try {
        const { error: notifError } = await supabaseAdmin.from('notifications').delete().eq('user_id', userId)
        if (notifError) {
          console.log('Notifications deletion error:', notifError)
        } else {
          console.log('Notifications deleted successfully')
        }
      } catch (error) {
        console.log('Notifications table may not exist:', error.message)
      }

      // Delete shop follows (if table exists)
      console.log('Deleting shop follows...')
      try {
        const { error: followsError } = await supabaseAdmin.from('shop_follows').delete().eq('user_id', userId)
        if (followsError) {
          console.log('Shop follows deletion error:', followsError)
        } else {
          console.log('Shop follows deleted successfully')
        }
      } catch (error) {
        console.log('shop_follows table may not exist:', error.message)
      }

      // Delete order items first (they reference orders)
      console.log('Fetching user orders...')
      const { data: userOrders, error: ordersError } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('buyer_id', userId)
      
      if (ordersError) {
        console.error('Error fetching orders:', ordersError)
      }
      
      const orderIds = userOrders?.map(order => order.id) || []
      console.log('Found orders:', orderIds)
      
      if (orderIds.length > 0) {
        console.log('Deleting order items...')
        const { error: orderItemsError } = await supabaseAdmin.from('order_items').delete().in('order_id', orderIds)
        if (orderItemsError) {
          console.error('Error deleting order items:', orderItemsError)
        } else {
          console.log('Order items deleted successfully')
        }
      }

      // Delete orders
      console.log('Deleting orders...')
      const { error: ordersDeleteError } = await supabaseAdmin.from('orders').delete().eq('buyer_id', userId)
      if (ordersDeleteError) {
        console.error('Error deleting orders:', ordersDeleteError)
      } else {
        console.log('Orders deleted successfully')
      }

      // Delete products (they reference shops)
      if (shopIds.length > 0) {
        console.log('Deleting products...')
        const { error: productsError } = await supabaseAdmin.from('products').delete().in('shop_id', shopIds)
        if (productsError) {
          console.error('Error deleting products:', productsError)
        } else {
          console.log('Products deleted successfully')
        }
      }

      // Delete seller stats (if table exists)
      if (shopIds.length > 0) {
        console.log('Deleting seller stats...')
        try {
          const { error: statsError } = await supabaseAdmin.from('seller_stats').delete().in('shop_id', shopIds)
          if (statsError) {
            console.log('Seller stats deletion error:', statsError)
          } else {
            console.log('Seller stats deleted successfully')
          }
        } catch (error) {
          console.log('seller_stats table may not exist:', error.message)
        }
      }

      // Delete shops
      console.log('Deleting shops...')
      const { error: shopsDeleteError } = await supabaseAdmin.from('shops').delete().eq('owner_id', userId)
      if (shopsDeleteError) {
        console.error('Error deleting shops:', shopsDeleteError)
      } else {
        console.log('Shops deleted successfully')
      }

      // Delete profile
      console.log('Deleting profile...')
      const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', userId)
      if (profileError) {
        console.error('Error deleting profile:', profileError)
      } else {
        console.log('Profile deleted successfully')
      }

      console.log('=== DATABASE CLEANUP COMPLETED ===')
    } catch (error) {
      console.error('Error during database cleanup:', error)
      // Continue with auth deletion even if some data cleanup failed
    }

    // Finally, delete the user from Supabase Auth
    console.log('=== DELETING USER FROM AUTH ===')
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (deleteError) {
      console.error('Error deleting user from auth:', deleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete user account', details: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('=== USER ACCOUNT DELETED SUCCESSFULLY ===')
    console.log('User deleted:', userId)

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('=== UNEXPECTED ERROR IN DELETE-USER FUNCTION ===')
    console.error('Error type:', error.constructor.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 