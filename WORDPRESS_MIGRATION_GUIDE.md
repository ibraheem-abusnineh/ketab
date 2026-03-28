# WordPress Migration Guide for Ketab Platform

## Option 1: WordPress as Headless CMS (Recommended)

### Architecture
```
WordPress (Backend/CMS)
    ↓ REST API
React App (Frontend)
    ↓ API Calls
WordPress Custom Endpoints
```

### Step 1: Set Up WordPress

1. **Install WordPress** on your server
2. **Enable REST API** (enabled by default in WordPress 4.7+)
3. **Install Required Plugins:**
   - JWT Authentication for WP REST API (for secure API access)
   - Custom Post Type UI (for letters, vocabulary)
   - Advanced Custom Fields (for structured data)

### Step 2: Create Custom Post Types

Create these custom post types in WordPress:

1. **Letters** (`letter`)
   - Fields: name, pronunciation, shapes, course_type
   - Meta: Arabic/English flag

2. **Vocabulary** (`vocabulary`)
   - Fields: word, emoji, image_url, video_url
   - Relationship: linked to letter

3. **Users** (use WordPress Users + custom fields)
   - Custom fields: national_number, school, directorate, role

### Step 3: Create Custom REST API Endpoints

Create a WordPress plugin to add custom endpoints:

```php
<?php
// wp-content/plugins/ketab-api/ketab-api.php

add_action('rest_api_init', function () {
    // User login endpoint
    register_rest_route('ketab/v1', '/login', array(
        'methods' => 'POST',
        'callback' => 'ketab_user_login',
        'permission_callback' => '__return_true'
    ));
    
    // Get letters endpoint
    register_rest_route('ketab/v1', '/letters', array(
        'methods' => 'GET',
        'callback' => 'ketab_get_letters',
        'permission_callback' => '__return_true'
    ));
    
    // Track visit endpoint
    register_rest_route('ketab/v1', '/track-visit', array(
        'methods' => 'POST',
        'callback' => 'ketab_track_visit',
        'permission_callback' => '__return_true'
    ));
    
    // Admin endpoints
    register_rest_route('ketab/v1', '/admin/login', array(
        'methods' => 'POST',
        'callback' => 'ketab_admin_login',
        'permission_callback' => '__return_true'
    ));
});

function ketab_user_login($request) {
    $national_number = $request->get_param('nationalNumber');
    
    // Query users by national number
    $users = get_users(array(
        'meta_key' => 'national_number',
        'meta_value' => $national_number
    ));
    
    if (empty($users)) {
        return new WP_Error('invalid_credentials', 'Invalid national number', array('status' => 401));
    }
    
    $user = $users[0];
    
    // Track visit
    ketab_track_visit_internal($user);
    
    return array(
        'success' => true,
        'user' => array(
            'nationalNumber' => get_user_meta($user->ID, 'national_number', true),
            'name' => $user->display_name,
            'role' => get_user_meta($user->ID, 'role', true),
            'school' => get_user_meta($user->ID, 'school', true)
        )
    );
}

function ketab_get_letters($request) {
    $course = $request->get_param('course') ?: 'arabic';
    
    $args = array(
        'post_type' => 'letter',
        'posts_per_page' => -1,
        'meta_query' => array(
            array(
                'key' => 'course_type',
                'value' => $course
            )
        )
    );
    
    $letters = get_posts($args);
    $result = array();
    
    foreach ($letters as $letter) {
        $result[$letter->post_title] = array(
            'name' => get_field('letter_name', $letter->ID),
            'pronunciation' => get_field('pronunciation', $letter->ID),
            'vocab' => ketab_get_vocabulary($letter->ID)
        );
    }
    
    return $result;
}

function ketab_track_visit($request) {
    // Implementation for visit tracking
    // Store in WordPress database
}
```

### Step 4: Update React App API Calls

Modify `src/utils/api.ts`:

```typescript
export const API_BASE = ((): string => {
  // WordPress REST API endpoint
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://your-wordpress-site.com/wp-json/ketab/v1';
  }
  return '/wp-json/ketab/v1';
})();
```

### Step 5: Deploy React App

1. Build React app: `npm run build`
2. Upload `build/` folder to WordPress theme or subdirectory
3. Configure WordPress to serve React app

---

## Option 2: Embed React App in WordPress (Easiest)

### How It Works
- Build React app as static files
- Embed in WordPress page using iframe or shortcode
- Keep Node.js backend separate or convert to WordPress

### Implementation

#### Step 1: Build React App
```bash
npm run build
```

#### Step 2: Upload to WordPress

**Option A: WordPress Subdirectory**
1. Upload `build/` folder to `/wp-content/ketab-app/`
2. Create WordPress page that redirects to app

**Option B: WordPress Shortcode Plugin**

Create `wp-content/plugins/ketab-embed/ketab-embed.php`:

```php
<?php
/**
 * Plugin Name: Ketab App Embed
 * Description: Embeds Ketab React application
 */

function ketab_app_shortcode($atts) {
    $app_url = plugin_dir_url(__FILE__) . '../ketab-app/index.html';
    return '<iframe src="' . $app_url . '" width="100%" height="800px" frameborder="0"></iframe>';
}
add_shortcode('ketab_app', 'ketab_app_shortcode');
```

Then use `[ketab_app]` in any WordPress page.

#### Step 3: Handle Backend

**Option A: Keep Node.js Backend**
- Deploy Node.js server separately
- Update React API calls to point to Node.js server
- Works but requires two servers

**Option B: Convert Backend to WordPress**
- Migrate all API endpoints to WordPress REST API
- Use WordPress database instead of JSON files
- Single server solution

### Pros
- ✅ Quickest to implement
- ✅ Minimal code changes
- ✅ Can keep existing backend

### Cons
- ❌ iframe limitations (SEO, navigation)
- ❌ May need two servers (React + Node.js)
- ❌ Not fully integrated with WordPress

---

## Option 3: Convert to WordPress Theme/Plugin (Most Integrated)

### How It Works
- Rewrite React components as WordPress PHP templates
- Convert React state to WordPress data
- Use WordPress admin for content management

### Implementation Steps

#### Step 1: Create Custom WordPress Theme

Create `wp-content/themes/ketab-theme/`:

```
ketab-theme/
├── style.css
├── functions.php
├── index.php
├── header.php
├── footer.php
├── page-letters.php
├── page-worksheet.php
├── page-profile.php
├── page-admin.php
└── assets/
    ├── js/
    │   └── ketab-app.js (converted React logic)
    └── css/
        └── ketab-styles.css
```

#### Step 2: Convert Components to PHP Templates

Example: `page-letters.php`

```php
<?php
/**
 * Template Name: Letters Index
 */

get_header();

$course = isset($_GET['course']) ? $_GET['course'] : 'arabic';
$letters = get_posts(array(
    'post_type' => 'letter',
    'posts_per_page' => -1,
    'meta_query' => array(
        array('key' => 'course_type', 'value' => $course)
    )
));
?>

<div class="ketab-letters-index">
    <div class="course-selection">
        <button class="course-btn <?php echo $course === 'arabic' ? 'active' : ''; ?>">
            اللغة العربية
        </button>
        <!-- More buttons -->
    </div>
    
    <div class="letters-grid">
        <?php foreach ($letters as $letter): ?>
            <div class="letter-box">
                <a href="/worksheet/<?php echo $letter->post_name; ?>">
                    <img src="<?php echo get_field('letter_image', $letter->ID); ?>" />
                    <span><?php echo get_field('letter_name', $letter->ID); ?></span>
                </a>
            </div>
        <?php endforeach; ?>
    </div>
</div>

<?php get_footer(); ?>
```

#### Step 3: Convert JavaScript Logic

Convert React components to vanilla JavaScript or use WordPress's React integration:

```javascript
// assets/js/ketab-app.js
(function($) {
    'use strict';
    
    $(document).ready(function() {
        // Letter click handler
        $('.letter-box').on('click', function() {
            const letter = $(this).data('letter');
            window.location.href = '/worksheet/' + letter;
        });
        
        // Course selection
        $('.course-btn').on('click', function() {
            const course = $(this).data('course');
            window.location.href = '/letters?course=' + course;
        });
    });
})(jQuery);
```

#### Step 4: Create WordPress Plugin for Backend

Create `wp-content/plugins/ketab-backend/ketab-backend.php`:

```php
<?php
/**
 * Plugin Name: Ketab Backend
 * Description: Backend functionality for Ketab platform
 */

// Register custom post types
function ketab_register_post_types() {
    register_post_type('letter', array(
        'public' => true,
        'label' => 'Letters',
        'supports' => array('title', 'editor', 'thumbnail'),
        'show_in_rest' => true
    ));
}
add_action('init', 'ketab_register_post_types');

// REST API endpoints
add_action('rest_api_init', function() {
    // Login endpoint
    register_rest_route('ketab/v1', '/login', array(
        'methods' => 'POST',
        'callback' => 'ketab_login',
        'permission_callback' => '__return_true'
    ));
});

function ketab_login($request) {
    $national_number = $request->get_param('nationalNumber');
    // Implementation
}
```

### Pros
- ✅ Fully integrated with WordPress
- ✅ Use WordPress admin for content
- ✅ Better SEO
- ✅ Single codebase

### Cons
- ❌ Requires significant rewriting
- ❌ Lose React benefits
- ❌ More development time

---

## Option 4: Hybrid Approach (Best of Both Worlds)

### How It Works
- WordPress for content management and admin
- React app for interactive learning features
- WordPress REST API connects them

### Architecture

```
WordPress (CMS + Admin)
    ↓ REST API
React App (Learning Interface)
    ↓ API Calls
WordPress Custom Endpoints
```

### Implementation

1. **WordPress handles:**
   - Content management (letters, vocabulary)
   - User management
   - Admin dashboard
   - Statistics

2. **React app handles:**
   - Interactive worksheets
   - Drag-and-drop exercises
   - Video playback
   - User interface

3. **Integration:**
   - React app loads data from WordPress REST API
   - User actions sent back to WordPress
   - WordPress manages all data

### Example Structure

```
your-site.com/
├── wp-admin/ (WordPress admin)
├── wp-content/
│   ├── themes/ketab-theme/
│   └── plugins/ketab-backend/
└── ketab-app/ (React app)
    ├── index.html
    └── static/
```

---

## Migration Checklist

### Data Migration
- [ ] Export users from `server/data/users.json` to WordPress users
- [ ] Export letters data to WordPress custom post types
- [ ] Export vocabulary to WordPress posts
- [ ] Migrate visit statistics to WordPress database
- [ ] Export notifications to WordPress

### Code Migration
- [ ] Set up WordPress REST API endpoints
- [ ] Update React API calls to WordPress endpoints
- [ ] Convert authentication to WordPress
- [ ] Migrate file uploads to WordPress media library
- [ ] Update admin dashboard to WordPress admin

### Deployment
- [ ] Set up WordPress hosting
- [ ] Install WordPress
- [ ] Install required plugins
- [ ] Upload React build files
- [ ] Configure WordPress permalinks
- [ ] Set up SSL certificate
- [ ] Test all functionality

---

## Recommended Approach

**For your project, I recommend Option 1 (Headless WordPress) or Option 4 (Hybrid):**

### Why?
1. **Preserves your React work** - You've built a great React app
2. **WordPress content management** - Easy for non-technical users
3. **Scalable** - Can grow with your needs
4. **Best of both worlds** - WordPress backend, React frontend

### Quick Start (Option 1)

1. **Install WordPress** on your server
2. **Create custom post types** for letters and vocabulary
3. **Build WordPress REST API plugin** with your endpoints
4. **Update React API base URL** to WordPress REST API
5. **Deploy React app** as static files
6. **Migrate data** from JSON to WordPress database

---

## Need Help?

If you want me to:
1. Create the WordPress plugin code
2. Set up the REST API endpoints
3. Create migration scripts
4. Update your React code for WordPress

Let me know which option you prefer and I'll help you implement it!

