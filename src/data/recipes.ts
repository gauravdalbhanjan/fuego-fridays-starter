/**
 * Step-by-step cooking instructions for dishes.
 * Ported from the my-app cooking guide. Keyed by dish id (see dishes.ts) so a
 * dish card can look up its recipe and show the cooking steps.
 */

export interface RecipeInstruction {
  /** Leading text of the instruction line. */
  text: string;
  /** Optional emphasized fragment rendered inline after `text`. */
  highlight?: string;
  /** Optional trailing text rendered after the highlight. */
  after?: string;
}

export interface RecipeStep {
  id: number;
  /** Short heading for this stage, e.g. "Make the Dressing". */
  section: string;
  /** Estimated time for the step, in seconds. */
  duration: number;
  instructions: RecipeInstruction[];
  /** A helpful pro-tip shown under the step. */
  tip?: string;
  /** Link to a video walkthrough for the step. */
  youtubeUrl?: string;
}

export interface Recipe {
  dishId: string;
  title: string;
  /** Short blurb shown under the hero on the recipe page. */
  description?: string;
  steps: RecipeStep[];
}

export const RECIPES: Record<string, Recipe> = {
  // Caesar Salad → dish id "d1"
  d1: {
    dishId: "d1",
    title: "Caesar Salad",
    description:
      "The makings of a classic: grilled white-meat chicken, Parmesan cheese and seasoned croutons, all atop a blend of romaine and iceberg lettuce.",
    steps: [
      {
        id: 1,
        section: "Make the Dressing",
        duration: 120,
        instructions: [
          { text: "In a small bowl, whisk together the mayonnaise, ", highlight: "Dijon, Worcestershire", after: ", and the juice of the lemon half." },
          { text: "Grate or press the garlic directly into the bowl." },
          { text: "Stir in half of the Parmesan." },
        ],
        tip: "Whisk vigorously to emulsify — the dressing should look creamy, not watery.",
        youtubeUrl: "https://www.youtube.com/results?search_query=caesar+salad+dressing+from+scratch",
      },
      {
        id: 2,
        section: "Prep the Lettuce",
        duration: 300,
        instructions: [
          { text: "Chop the Romaine into bite-sized pieces." },
          { text: "If it isn't pre-washed, rinse it and spin it bone-dry. (Dressing won't stick to wet leaves!)" },
        ],
        tip: "Spin the lettuce twice to make sure it is completely dry.",
        youtubeUrl: "https://www.youtube.com/results?search_query=how+to+prep+romaine+lettuce",
      },
      {
        id: 3,
        section: "Toss the Salad",
        duration: 120,
        instructions: [
          { text: "Add the lettuce to a large bowl." },
          { text: "Pour the dressing over and toss thoroughly until every leaf is glossy." },
        ],
        tip: "Use two large spoons or salad tongs for even coating.",
        youtubeUrl: "https://www.youtube.com/results?search_query=how+to+toss+caesar+salad",
      },
      {
        id: 4,
        section: "Finish & Plate",
        duration: 60,
        instructions: [
          { text: "Top with the croutons, the remaining Parmesan, and a heavy crack of black pepper." },
        ],
        tip: "Add croutons last so they stay crunchy.",
        youtubeUrl: "https://www.youtube.com/results?search_query=caesar+salad+plating+finishing",
      },
    ],
  },
};

/** Optional hero image + blurb for the recipe page. */

/** Look up a recipe by dish id. Returns undefined if the dish has no recipe yet. */
export function getRecipe(dishId: string): Recipe | undefined {
  return RECIPES[dishId];
}

/** Total estimated cook time for a recipe, in minutes (rounded up). */
export function totalRecipeMinutes(recipe: Recipe): number {
  const secs = recipe.steps.reduce((sum, s) => sum + s.duration, 0);
  return Math.ceil(secs / 60);
}
