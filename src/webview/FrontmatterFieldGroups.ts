import { SettingsField } from './SettingsPanel';

export function getAllFrontmatterFieldGroups(existingValues: { [key: string]: string }, defaultTitle: string): { [groupName: string]: SettingsField[] } {
  return {
    'Page metadata': [
      {
        name: 'title',
        type: 'text',
        label: 'Title',
        description: 'The title of your page that appears in navigation and browser tabs.',
        defaultValue: defaultTitle,
        currentValue: existingValues.title
      },
      {
        name: 'description',
        type: 'text',
        label: 'Description',
        description: 'A brief description of what this page covers. Appears under the title and improves SEO.',
        currentValue: existingValues.description
      },
      {
        name: 'sidebarTitle',
        type: 'text',
        label: 'Sidebar Title',
        description: 'A short title that displays in the sidebar navigation.',
        currentValue: existingValues.sidebarTitle
      },
      {
        name: 'icon',
        type: 'searchable',
        label: 'Icon',
        description: 'The icon to display.',
        currentValue: existingValues.icon
      },
      {
        name: 'iconType',
        type: 'select',
        label: 'Icon Type',
        description: 'The Font Awesome icon style. Only used with Font Awesome icons.',
        options: ['', 'solid', 'regular', 'light', 'duotone', 'brands'],
        currentValue: existingValues.iconType
      },
      {
        name: 'tag',
        type: 'text',
        label: 'Tag',
        description: 'A tag that appears next to your page title in the sidebar.',
        currentValue: existingValues.tag
      }
    ],
    'Page mode': [
      {
        name: 'mode',
        type: 'select',
        label: 'Mode',
        description: 'Page display mode. Center mode removes the sidebar and table of contents.',
        options: ['', 'center', 'wide', 'custom'],
        currentValue: existingValues.mode
      }
    ],
    'API pages': [
      {
        name: 'openapi',
        type: 'text',
        label: 'OpenAPI',
        description: 'Create interactive API playgrounds by adding an API specification.',
        currentValue: existingValues.openapi,
        placeholder: 'GET /endpoint'
      }
    ],
    'Internal search keywords': [
      {
        name: 'keywords',
        type: 'text',
        label: 'Keywords',
        description: 'Enhance page discoverability in search by providing keywords.',
        currentValue: existingValues.keywords,
        placeholder: "['configuration', 'setup', 'getting started']"
      }
    ],
    'SEO - Basic meta tags': [
      {
        name: "'robots'",
        type: 'text',
        label: 'Robots',
        description: 'Tells search engines how to crawl and index the page',
        currentValue: existingValues["'robots'"],
        placeholder: 'index, follow'
      },
      {
        name: "'charset'",
        type: 'text',
        label: 'Charset',
        description: 'Character encoding for the HTML document',
        currentValue: existingValues["'charset'"],
        placeholder: 'UTF-8'
      },
      {
        name: "'viewport'",
        type: 'text',
        label: 'Viewport',
        description: 'Controls the viewport settings for responsive design',
        currentValue: existingValues["'viewport'"],
        placeholder: 'width=device-width, initial-scale=1.0'
      },
      {
        name: "'description'",
        type: 'text',
        label: 'Meta Description',
        description: 'Meta description for SEO',
        currentValue: existingValues["'description'"],
        placeholder: 'Page description'
      },
      {
        name: "'keywords'",
        type: 'text',
        label: 'Meta Keywords',
        description: 'SEO keywords for the page',
        currentValue: existingValues["'keywords'"],
        placeholder: 'keyword1, keyword2, keyword3'
      },
      {
        name: "'author'",
        type: 'text',
        label: 'Author',
        description: 'Author of the content',
        currentValue: existingValues["'author'"],
        placeholder: 'Author Name'
      },
      {
        name: "'googlebot'",
        type: 'text',
        label: 'Googlebot',
        description: 'Specific instructions for Google\'s crawler',
        currentValue: existingValues["'googlebot'"],
        placeholder: 'index, follow'
      },
      {
        name: "'google'",
        type: 'text',
        label: 'Google',
        description: 'Google-specific meta tag',
        currentValue: existingValues["'google'"],
        placeholder: 'notranslate'
      },
      {
        name: "'google-site-verification'",
        type: 'text',
        label: 'Google Site Verification',
        description: 'Google Search Console verification',
        currentValue: existingValues["'google-site-verification'"],
        placeholder: 'verification_token'
      },
      {
        name: "'generator'",
        type: 'text',
        label: 'Generator',
        description: 'Tool used to generate the page',
        currentValue: existingValues["'generator'"],
        placeholder: 'Mintlify'
      },
      {
        name: "'theme-color'",
        type: 'text',
        label: 'Theme Color',
        description: 'Browser theme color',
        currentValue: existingValues["'theme-color'"],
        placeholder: '#000000'
      },
      {
        name: "'color-scheme'",
        type: 'text',
        label: 'Color Scheme',
        description: 'Supported color schemes',
        currentValue: existingValues["'color-scheme'"],
        placeholder: 'light dark'
      },
      {
        name: "'format-detection'",
        type: 'text',
        label: 'Format Detection',
        description: 'Controls automatic format detection',
        currentValue: existingValues["'format-detection'"]
      },
      {
        name: "'referrer'",
        type: 'text',
        label: 'Referrer',
        description: 'Referrer policy',
        currentValue: existingValues["'referrer'"]
      },
      {
        name: "'refresh'",
        type: 'text',
        label: 'Refresh',
        description: 'Auto-refresh interval in seconds',
        currentValue: existingValues["'refresh'"]
      },
      {
        name: "'rating'",
        type: 'text',
        label: 'Rating',
        description: 'Content rating',
        currentValue: existingValues["'rating'"]
      },
      {
        name: "'revisit-after'",
        type: 'text',
        label: 'Revisit After',
        description: 'How often search engines should revisit',
        currentValue: existingValues["'revisit-after'"]
      },
      {
        name: "'language'",
        type: 'text',
        label: 'Language',
        description: 'Page language',
        currentValue: existingValues["'language'"]
      },
      {
        name: "'copyright'",
        type: 'text',
        label: 'Copyright',
        description: 'Copyright information',
        currentValue: existingValues["'copyright'"]
      },
      {
        name: "'reply-to'",
        type: 'text',
        label: 'Reply To',
        description: 'Reply-to email address',
        currentValue: existingValues["'reply-to'"]
      },
      {
        name: "'distribution'",
        type: 'text',
        label: 'Distribution',
        description: 'Content distribution scope',
        currentValue: existingValues["'distribution'"]
      },
      {
        name: "'coverage'",
        type: 'text',
        label: 'Coverage',
        description: 'Geographic coverage',
        currentValue: existingValues["'coverage'"]
      },
      {
        name: "'category'",
        type: 'text',
        label: 'Category',
        description: 'Content category',
        currentValue: existingValues["'category'"]
      },
      {
        name: "'target'",
        type: 'text',
        label: 'Target',
        description: 'Target audience',
        currentValue: existingValues["'target'"]
      }
    ],
    'SEO - Mobile optimization': [
      {
        name: "'HandheldFriendly'",
        type: 'text',
        label: 'Handheld Friendly',
        description: 'Indicates mobile-friendly content',
        currentValue: existingValues["'HandheldFriendly'"]
      },
      {
        name: "'MobileOptimized'",
        type: 'text',
        label: 'Mobile Optimized',
        description: 'Optimal mobile width',
        currentValue: existingValues["'MobileOptimized'"]
      },
      {
        name: "'apple-mobile-web-app-capable'",
        type: 'text',
        label: 'iOS Web App Capable',
        description: 'iOS web app capability',
        currentValue: existingValues["'apple-mobile-web-app-capable'"]
      },
      {
        name: "'apple-mobile-web-app-status-bar-style'",
        type: 'text',
        label: 'iOS Status Bar Style',
        description: 'iOS status bar style',
        currentValue: existingValues["'apple-mobile-web-app-status-bar-style'"]
      },
      {
        name: "'apple-mobile-web-app-title'",
        type: 'text',
        label: 'iOS App Title',
        description: 'iOS app title',
        currentValue: existingValues["'apple-mobile-web-app-title'"]
      },
      {
        name: "'application-name'",
        type: 'text',
        label: 'Application Name',
        description: 'Application name',
        currentValue: existingValues["'application-name'"]
      },
      {
        name: "'msapplication-TileColor'",
        type: 'text',
        label: 'Windows Tile Color',
        description: 'Windows tile color',
        currentValue: existingValues["'msapplication-TileColor'"]
      },
      {
        name: "'msapplication-TileImage'",
        type: 'text',
        label: 'Windows Tile Image',
        description: 'Windows tile image path',
        currentValue: existingValues["'msapplication-TileImage'"]
      },
      {
        name: "'msapplication-config'",
        type: 'text',
        label: 'Windows Config',
        description: 'Windows config file path',
        currentValue: existingValues["'msapplication-config'"]
      }
    ],
    'SEO - Open Graph': [
      {
        name: "'og:title'",
        type: 'text',
        label: 'OG Title',
        description: 'Open Graph title',
        currentValue: existingValues["'og:title'"],
        placeholder: 'Open Graph Title'
      },
      {
        name: "'og:type'",
        type: 'text',
        label: 'OG Type',
        description: 'Open Graph content type',
        currentValue: existingValues["'og:type'"],
        placeholder: 'website'
      },
      {
        name: "'og:url'",
        type: 'text',
        label: 'OG URL',
        description: 'Open Graph URL',
        currentValue: existingValues["'og:url'"],
        placeholder: 'https://example.com'
      },
      {
        name: "'og:image'",
        type: 'text',
        label: 'OG Image',
        description: 'Open Graph image',
        currentValue: existingValues["'og:image'"],
        placeholder: 'https://example.com/image.jpg'
      },
      {
        name: "'og:description'",
        type: 'text',
        label: 'OG Description',
        description: 'Open Graph description',
        currentValue: existingValues["'og:description'"],
        placeholder: 'Open Graph Description'
      },
      {
        name: "'og:site_name'",
        type: 'text',
        label: 'OG Site Name',
        description: 'Open Graph site name',
        currentValue: existingValues["'og:site_name'"],
        placeholder: 'Site Name'
      },
      {
        name: "'og:locale'",
        type: 'text',
        label: 'OG Locale',
        description: 'Open Graph locale',
        currentValue: existingValues["'og:locale'"]
      },
      {
        name: "'og:video'",
        type: 'text',
        label: 'OG Video',
        description: 'Open Graph video',
        currentValue: existingValues["'og:video'"]
      },
      {
        name: "'og:audio'",
        type: 'text',
        label: 'OG Audio',
        description: 'Open Graph audio',
        currentValue: existingValues["'og:audio'"]
      }
    ],
    'SEO - Twitter Cards': [
      {
        name: "'twitter:card'",
        type: 'text',
        label: 'Twitter Card',
        description: 'Twitter card type',
        currentValue: existingValues["'twitter:card'"],
        placeholder: 'summary'
      },
      {
        name: "'twitter:site'",
        type: 'text',
        label: 'Twitter Site',
        description: 'Twitter site username',
        currentValue: existingValues["'twitter:site'"],
        placeholder: '@username'
      },
      {
        name: "'twitter:creator'",
        type: 'text',
        label: 'Twitter Creator',
        description: 'Twitter creator username',
        currentValue: existingValues["'twitter:creator'"],
        placeholder: '@username'
      },
      {
        name: "'twitter:title'",
        type: 'text',
        label: 'Twitter Title',
        description: 'Twitter card title',
        currentValue: existingValues["'twitter:title'"],
        placeholder: 'Twitter Title'
      },
      {
        name: "'twitter:description'",
        type: 'text',
        label: 'Twitter Description',
        description: 'Twitter card description',
        currentValue: existingValues["'twitter:description'"],
        placeholder: 'Twitter Description'
      },
      {
        name: "'twitter:image'",
        type: 'text',
        label: 'Twitter Image',
        description: 'Twitter card image',
        currentValue: existingValues["'twitter:image'"],
        placeholder: 'https://example.com/image.jpg'
      },
      {
        name: "'twitter:image:alt'",
        type: 'text',
        label: 'Twitter Image Alt',
        description: 'Twitter image alt text',
        currentValue: existingValues["'twitter:image:alt'"]
      },
      {
        name: "'twitter:player'",
        type: 'text',
        label: 'Twitter Player',
        description: 'Twitter player URL',
        currentValue: existingValues["'twitter:player'"]
      },
      {
        name: "'twitter:player:width'",
        type: 'text',
        label: 'Twitter Player Width',
        description: 'Twitter player width',
        currentValue: existingValues["'twitter:player:width'"]
      },
      {
        name: "'twitter:player:height'",
        type: 'text',
        label: 'Twitter Player Height',
        description: 'Twitter player height',
        currentValue: existingValues["'twitter:player:height'"]
      },
      {
        name: "'twitter:app:name:iphone'",
        type: 'text',
        label: 'iPhone App Name',
        description: 'iPhone app name',
        currentValue: existingValues["'twitter:app:name:iphone'"]
      },
      {
        name: "'twitter:app:id:iphone'",
        type: 'text',
        label: 'iPhone App ID',
        description: 'iPhone app ID',
        currentValue: existingValues["'twitter:app:id:iphone'"]
      },
      {
        name: "'twitter:app:url:iphone'",
        type: 'text',
        label: 'iPhone App URL',
        description: 'iPhone app URL',
        currentValue: existingValues["'twitter:app:url:iphone'"]
      }
    ],
    'SEO - Article metadata': [
      {
        name: "'article:published_time'",
        type: 'text',
        label: 'Article Published Time',
        description: 'Article publish time',
        currentValue: existingValues["'article:published_time'"]
      },
      {
        name: "'article:modified_time'",
        type: 'text',
        label: 'Article Modified Time',
        description: 'Article modification time',
        currentValue: existingValues["'article:modified_time'"]
      },
      {
        name: "'article:expiration_time'",
        type: 'text',
        label: 'Article Expiration Time',
        description: 'Article expiration time',
        currentValue: existingValues["'article:expiration_time'"]
      },
      {
        name: "'article:author'",
        type: 'text',
        label: 'Article Author',
        description: 'Article author',
        currentValue: existingValues["'article:author'"]
      },
      {
        name: "'article:section'",
        type: 'text',
        label: 'Article Section',
        description: 'Article section',
        currentValue: existingValues["'article:section'"]
      },
      {
        name: "'article:tag'",
        type: 'text',
        label: 'Article Tag',
        description: 'Article tags',
        currentValue: existingValues["'article:tag'"]
      }
    ],
    'SEO - Additional metadata': [
      {
        name: "'book:author'",
        type: 'text',
        label: 'Book Author',
        description: 'Book author',
        currentValue: existingValues["'book:author'"]
      },
      {
        name: "'book:isbn'",
        type: 'text',
        label: 'Book ISBN',
        description: 'Book ISBN',
        currentValue: existingValues["'book:isbn'"]
      },
      {
        name: "'book:release_date'",
        type: 'text',
        label: 'Book Release Date',
        description: 'Book release date',
        currentValue: existingValues["'book:release_date'"]
      },
      {
        name: "'book:tag'",
        type: 'text',
        label: 'Book Tag',
        description: 'Book tags',
        currentValue: existingValues["'book:tag'"]
      },
      {
        name: "'profile:first_name'",
        type: 'text',
        label: 'Profile First Name',
        description: 'Profile first name',
        currentValue: existingValues["'profile:first_name'"]
      },
      {
        name: "'profile:last_name'",
        type: 'text',
        label: 'Profile Last Name',
        description: 'Profile last name',
        currentValue: existingValues["'profile:last_name'"]
      },
      {
        name: "'profile:username'",
        type: 'text',
        label: 'Profile Username',
        description: 'Profile username',
        currentValue: existingValues["'profile:username'"]
      },
      {
        name: "'profile:gender'",
        type: 'text',
        label: 'Profile Gender',
        description: 'Profile gender',
        currentValue: existingValues["'profile:gender'"]
      },
      {
        name: "'music:duration'",
        type: 'text',
        label: 'Music Duration',
        description: 'Music duration in seconds',
        currentValue: existingValues["'music:duration'"]
      },
      {
        name: "'music:album'",
        type: 'text',
        label: 'Music Album',
        description: 'Music album name',
        currentValue: existingValues["'music:album'"]
      },
      {
        name: "'music:album:disc'",
        type: 'text',
        label: 'Music Album Disc',
        description: 'Music album disc number',
        currentValue: existingValues["'music:album:disc'"]
      },
      {
        name: "'music:album:track'",
        type: 'text',
        label: 'Music Album Track',
        description: 'Music album track number',
        currentValue: existingValues["'music:album:track'"]
      },
      {
        name: "'music:musician'",
        type: 'text',
        label: 'Music Musician',
        description: 'Musician name',
        currentValue: existingValues["'music:musician'"]
      },
      {
        name: "'music:song'",
        type: 'text',
        label: 'Music Song',
        description: 'Song name',
        currentValue: existingValues["'music:song'"]
      },
      {
        name: "'music:song:disc'",
        type: 'text',
        label: 'Music Song Disc',
        description: 'Song disc number',
        currentValue: existingValues["'music:song:disc'"]
      },
      {
        name: "'music:song:track'",
        type: 'text',
        label: 'Music Song Track',
        description: 'Song track number',
        currentValue: existingValues["'music:song:track'"]
      },
      {
        name: "'video:actor'",
        type: 'text',
        label: 'Video Actor',
        description: 'Video actor name',
        currentValue: existingValues["'video:actor'"]
      },
      {
        name: "'video:actor:role'",
        type: 'text',
        label: 'Video Actor Role',
        description: 'Video actor role',
        currentValue: existingValues["'video:actor:role'"]
      },
      {
        name: "'video:director'",
        type: 'text',
        label: 'Video Director',
        description: 'Video director',
        currentValue: existingValues["'video:director'"]
      },
      {
        name: "'video:writer'",
        type: 'text',
        label: 'Video Writer',
        description: 'Video writer',
        currentValue: existingValues["'video:writer'"]
      },
      {
        name: "'video:duration'",
        type: 'text',
        label: 'Video Duration',
        description: 'Video duration in seconds',
        currentValue: existingValues["'video:duration'"]
      },
      {
        name: "'video:release_date'",
        type: 'text',
        label: 'Video Release Date',
        description: 'Video release date',
        currentValue: existingValues["'video:release_date'"]
      },
      {
        name: "'video:tag'",
        type: 'text',
        label: 'Video Tag',
        description: 'Video tags',
        currentValue: existingValues["'video:tag'"]
      },
      {
        name: "'video:series'",
        type: 'text',
        label: 'Video Series',
        description: 'Video series name',
        currentValue: existingValues["'video:series'"]
      }
    ]
  };
}
