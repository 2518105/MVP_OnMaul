import { getUser } from "../api/auth";

function uid() { return getUser()?.id ?? "guest"; }
const SAVES_KEY = () => `saved_posts_${uid()}`;
const LIKES_KEY = () => `liked_posts_${uid()}`;
const COMMENTS_KEY = () => `my_comments_${uid()}`;

function getArr(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; }
  catch { return []; }
}
function setArr(key, arr) {
  localStorage.setItem(key, JSON.stringify(arr));
}

// 저장한 글
export function getSavedPosts() { return getArr(SAVES_KEY()); }
export function savePost(post) {
  const arr = getArr(SAVES_KEY());
  if (!arr.find(p => p.id === post.id)) setArr(SAVES_KEY(), [post, ...arr]);
}
export function unsavePost(id) {
  setArr(SAVES_KEY(), getArr(SAVES_KEY()).filter(p => p.id !== id));
}
export function isPostSaved(id) {
  return getArr(SAVES_KEY()).some(p => p.id === id);
}

// 좋아요 한 글
export function getLikedPosts() { return getArr(LIKES_KEY()); }
export function addLikedPost(post) {
  const arr = getArr(LIKES_KEY());
  if (!arr.find(p => p.id === post.id)) setArr(LIKES_KEY(), [post, ...arr]);
}
export function removeLikedPost(id) {
  setArr(LIKES_KEY(), getArr(LIKES_KEY()).filter(p => p.id !== id));
}

// 내 댓글
export function getMyComments() { return getArr(COMMENTS_KEY()); }
export function addMyComment({ postId, postTitle, content }) {
  const arr = getArr(COMMENTS_KEY());
  setArr(COMMENTS_KEY(), [{ postId, postTitle, content, date: new Date().toISOString() }, ...arr]);
}
