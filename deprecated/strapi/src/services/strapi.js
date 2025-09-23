const STRAPI_URL = process.env.REACT_APP_STRAPI_URL || 'http://localhost:1337';

export const strapiAPI = {
  // Fetch all blog posts
  async getPosts(params = {}) {
    const query = new URLSearchParams({
      populate: '*',
      sort: 'publishedAt:desc',
      ...params
    });
    
    const response = await fetch(`${STRAPI_URL}/api/blog-posts?${query}`);
    return response.json();
  },

  // Fetch single post by slug
  async getPostBySlug(slug) {
    const response = await fetch(
      `${STRAPI_URL}/api/blog-posts?filters[slug][$eq]=${slug}&populate=*`
    );
    const data = await response.json();
    return data.data[0];
  },

  // Fetch categories
  async getCategories() {
    const response = await fetch(`${STRAPI_URL}/api/categories?populate=*`);
    return response.json();
  },

  // Fetch posts by category
  async getPostsByCategory(categorySlug) {
    const response = await fetch(
      `${STRAPI_URL}/api/blog-posts?filters[categories][slug][$eq]=${categorySlug}&populate=*`
    );
    return response.json();
  },

  // Search posts
  async searchPosts(searchTerm) {
    const response = await fetch(
      `${STRAPI_URL}/api/blog-posts?filters[$or][0][title][$containsi]=${searchTerm}&filters[$or][1][content][$containsi]=${searchTerm}&populate=*`
    );
    return response.json();
  },

  // Get paginated posts
  async getPaginatedPosts(page = 1, pageSize = 9) {
    const response = await fetch(
      `${STRAPI_URL}/api/blog-posts?pagination[page]=${page}&pagination[pageSize]=${pageSize}&populate=*&sort=publishedAt:desc`
    );
    return response.json();
  }
};