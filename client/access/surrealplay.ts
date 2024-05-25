//import Surreal from "surrealdb.js";
import { SurrealDatabase } from "./surrealHelper";

// const db = new Surreal(import.meta.env.VITE_SURREAL_URL, {
//   // Set the namespace and database for the connection
//   ns: "surrealtrial",
//   db: "surrealtrial",

//   // Set the authentication details for the connection
//   auth: {
//     NS: "surrealtrial",
//     DB: "surrealtrial",
//     user: "arv",
//     pass: "test123",
//   },
// });

// const db2 = new Surreal(import.meta.env.VITE_SURREAL_URL, {
//   // Set the namespace and database for the connection
//   ns: "surrealtrial",
//   db: "surrealtrial",

//   // Set the authentication details for the connection
//   auth: "",
// });
export async function runsurrealsampleUsingSurrealJs() {
  try {
    const created = await db.create("post", {
      body: "Founder & CEO",
      extras: {
        first: "Tobie",
        last: "Morgan Hitchcock",
      },
      published: true,
    });
    const updated = await db.merge("post:fifthpost", {
      published: false,
    });
    const people = await db.select("post");

    const groups = await db.query("select * from $tb;", {
      tb: "post",
    });
  } catch (e) {
    console.error("ERROR", e);
  }
}

const db = new SurrealDatabase(import.meta.env.VITE_SURREAL_URL);

export async function runsurrealsample() {
  try {
    const simplequery = await db.query("select * from $tb;", {
      tb: "post",
    });
    const selectquery = await db.select("post:fifthpost");
    const createquery = await db.create("post:seventhpost", {
      body: "some body of the post",
      extras: {
        first: "Blanker",
        last: "LastBlank",
      },
      published: true,
    });
    const updated = await db.merge("post:seventhpost", {
      published: false,
    });
  } catch (e) {
    console.error("ERROR", e);
  }
}
