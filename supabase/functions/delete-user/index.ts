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
    // Create a Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the user from the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the user token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id
    console.log('Deleting user account:', userId)

    // Delete user data in proper order
    const deletionSteps = [
      // 1. Get user's shop IDs for cascade deletions
      async () => {
        const { data: userShops } = await supabaseAdmin
          .from('shops')
          .select('id')
          .eq('owner_id', userId)
        return userShops?.map(shop => shop.id) || []
      },

      // 2. Delete shop followers
      async (shopIds: string[]) => {
        if (shopIds.length > 0) {
          await supabaseAdmin
            .from('shop_followers')
            .delete()
            .or(`user_id.eq.${userId},shop_id.in.(${shopIds.map(id => `"${id}"`).join(',')})`)
        }
        await supabaseAdmin
          .from('shop_followers')
          .delete()
          .eq('user_id', userId)
      },

      // 3. Delete reviews
      async () => {
        await supabaseAdmin.from('product_reviews').delete().eq('buyer_id', userId)
        await supabaseAdmin.from('shop_reviews').delete().eq('buyer_id', userId)
      },

      // 4. Delete messages and comments
      async () => {
        await supabaseAdmin.from('private_messages').delete().or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        await supabaseAdmin.from('product_comments').delete().eq('user_id', userId)
        await supabaseAdmin.from('order_comments').delete().eq('user_id', userId)
      },

      // 5. Delete order items and orders
      async () => {
        const { data: userOrders } = await supabaseAdmin
          .from('orders')
          .select('id')
          .eq('buyer_id', userId)
        
        const orderIds = userOrders?.map(order => order.id) || []
        
        if (orderIds.length > 0) {
          await supabaseAdmin.from('order_items').delete().in('order_id', orderIds)
        }
        
        await supabaseAdmin.from('orders').delete().eq('buyer_id', userId)
      },

      // 6. Delete products and related data
      async (shopIds: string[]) => {
        if (shopIds.length > 0) {
          await supabaseAdmin.from('products').delete().in('shop_id', shopIds)
          await supabaseAdmin.from('seller_stats').delete().in('shop_id', shopIds)
        }
      },

      // 7. Delete shops
      async () => {
        await supabaseAdmin.from('shops').delete().eq('owner_id', userId)
      },

      // 8. Delete other user data
      async () => {
        await supabaseAdmin.from('wishlist').delete().eq('user_id', userId)
        await supabaseAdmin.from('notifications').delete().eq('user_id', userId)
        await supabaseAdmin.from('product_views').delete().eq('user_id', userId)
        await supabaseAdmin.from('seller_verifications').delete().eq('user_id', userId)
      },

      // 9. Delete profile
      async () => {
        await supabaseAdmin.from('profiles').delete().eq('id', userId)
      }
    ]

    // Execute deletion steps
    let shopIds: string[] = []
    
    try {
      // Get shop IDs first
      shopIds = await deletionSteps[0]()
      
      // Execute all deletion steps
      await deletionSteps[1](shopIds) // shop followers
      await deletionSteps[2]() // reviews
      await deletionSteps[3]() // messages
      await deletionSteps[4]() // orders
      await deletionSteps[5](shopIds) // products
      await deletionSteps[6]() // shops
      await deletionSteps[7]() // other data
      await deletionSteps[8]() // profile
      
      console.log('Database cleanup completed for user:', userId)
    } catch (error) {
      console.error('Error during database cleanup:', error)
      // Continue with auth deletion even if some data cleanup failed
    }

    // Finally, delete the user from Supabase Auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (deleteError) {
      console.error('Error deleting user from auth:', deleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete user account', details: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User account deleted successfully:', userId)

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in delete-user function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 