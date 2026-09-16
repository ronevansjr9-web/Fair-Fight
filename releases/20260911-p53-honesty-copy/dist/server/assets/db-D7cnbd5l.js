import { neon } from "@neondatabase/serverless";
const sql = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set — connect a database (via the database card) before running queries."
    );
  }
  return neon(url);
};
export {
  sql as s
};
