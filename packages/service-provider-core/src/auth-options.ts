export default interface AuthOptions {
  user: string;
  pwd: string;
  mechanism?: string;
  digestPassword?: boolean;
  authDb?: string;
}
