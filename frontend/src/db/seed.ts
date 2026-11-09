// Starter datasets. Values are per 100 g (or 100 ml for liquids).
// Sources: USDA FoodData Central (FDC) generic entries and IFCT 2017 (ICMR-NIN) where noted.
// Home-cooked Indian dishes vary widely; those rows are marked "Estimate (home-style)".
import { db } from "./client";

type S = [string, string, number]; // label, unit, grams
type F = [string, number, number, number, number, string, string[], S[], string?];
const USDA = "USDA FDC";
const IFCT = "IFCT 2017";
const EST = "Estimate (home-style)";

const FOODS: F[] = [
  ["Rice, white (cooked)", 130, 2.7, 28.2, 0.3, USDA, ["rice", "chawal", "bhaat", "chaawal", "steamed rice"], [["1 katori (150 g)", "bowl", 150], ["1 cup (160 g)", "cup", 160]]],
  ["Rice, brown (cooked)", 112, 2.3, 23.5, 0.8, USDA, ["brown rice"], [["1 cup (160 g)", "cup", 160]]],
  ["Roti / Chapati (whole wheat)", 297, 11.3, 46.4, 7.5, USDA, ["roti", "chapati", "chapatti", "phulka", "fulka", "rotli"], [["1 medium roti (40 g)", "piece", 40]]],
  ["Paratha, plain", 326, 6.4, 45.4, 13.2, USDA, ["paratha", "parantha", "parotta"], [["1 paratha (80 g)", "piece", 80]]],
  ["Dal, lentils (boiled)", 116, 9.0, 20.1, 0.4, USDA, ["dal", "daal", "dhal", "lentils", "masoor dal", "moong dal", "toor dal", "arhar dal"], [["1 katori (150 g)", "bowl", 150]]],
  ["Dal tadka", 120, 6.0, 15.0, 4.0, EST, ["dal tadka", "dal fry", "tadka dal"], [["1 katori (150 g)", "bowl", 150]]],
  ["Rajma curry", 140, 6.5, 18.0, 4.5, EST, ["rajma", "rajma masala", "kidney bean curry"], [["1 katori (150 g)", "bowl", 150]]],
  ["Kidney beans (boiled)", 127, 8.7, 22.8, 0.5, USDA, ["kidney beans", "rajma boiled"], []],
  ["Chickpeas / Chole (boiled)", 164, 8.9, 27.4, 2.6, USDA, ["chole", "chana", "chickpeas", "kabuli chana", "chhole"], [["1 katori (150 g)", "bowl", 150]]],
  ["Chole masala", 150, 6.5, 19.0, 5.5, EST, ["chole masala", "chana masala", "pindi chole"], [["1 katori (150 g)", "bowl", 150]]],
  ["Paneer", 265, 18.3, 1.2, 20.8, IFCT, ["paneer", "cottage cheese", "panir"], [["1 cube (20 g)", "piece", 20]]],
  ["Palak paneer", 150, 7.0, 6.0, 11.0, EST, ["palak paneer", "saag paneer"], [["1 katori (150 g)", "bowl", 150]]],
  ["Egg, whole (boiled)", 155, 12.6, 1.1, 10.6, USDA, ["egg", "eggs", "anda", "ande", "boiled egg"], [["1 large egg (50 g)", "piece", 50]]],
  ["Egg white", 52, 10.9, 0.7, 0.2, USDA, ["egg white", "egg whites"], [["1 egg white (33 g)", "piece", 33]]],
  ["Omelette (1 egg, oil)", 154, 10.6, 0.6, 11.7, USDA, ["omelette", "omelet", "anda bhurji", "bhurji"], [["1-egg omelette (60 g)", "piece", 60]]],
  ["Milk, toned (3% fat)", 58, 3.1, 4.7, 3.0, IFCT, ["milk", "doodh", "dudh", "toned milk"], [["1 glass (250 ml)", "glass", 250], ["1 cup (200 ml)", "cup", 200]], "ml"],
  ["Milk, whole", 61, 3.2, 4.8, 3.3, USDA, ["whole milk", "full cream milk"], [["1 glass (250 ml)", "glass", 250]], "ml"],
  ["Curd / Dahi (plain)", 61, 3.5, 4.7, 3.3, USDA, ["curd", "dahi", "yogurt", "yoghurt"], [["1 katori (150 g)", "bowl", 150]]],
  ["Greek yogurt, plain non-fat", 59, 10.2, 3.6, 0.4, USDA, ["greek yogurt", "hung curd"], [["1 cup (170 g)", "cup", 170]]],
  ["Chicken breast (cooked)", 165, 31.0, 0, 3.6, USDA, ["chicken", "chicken breast", "murgh", "grilled chicken"], []],
  ["Chicken curry", 150, 14.0, 4.0, 9.0, EST, ["chicken curry", "murgh curry", "butter chicken"], [["1 katori (150 g)", "bowl", 150]]],
  ["Chicken biryani", 170, 8.0, 22.0, 6.0, EST, ["biryani", "chicken biryani"], [["1 plate (300 g)", "plate", 300]]],
  ["Fish, salmon (cooked)", 206, 22.1, 0, 12.4, USDA, ["salmon"], []],
  ["Tuna, canned in water", 116, 25.5, 0, 0.8, USDA, ["tuna"], []],
  ["Oats (dry)", 389, 16.9, 66.3, 6.9, USDA, ["oats", "oatmeal", "rolled oats"], [["1/2 cup (40 g)", "cup", 40]]],
  ["Poha (cooked)", 180, 3.5, 30.0, 5.0, EST, ["poha", "pohe", "aval"], [["1 plate (150 g)", "plate", 150]]],
  ["Upma", 160, 4.0, 23.0, 6.0, EST, ["upma", "uppittu"], [["1 plate (150 g)", "plate", 150]]],
  ["Idli", 130, 4.5, 26.0, 0.6, EST, ["idli", "idly"], [["1 idli (40 g)", "piece", 40]]],
  ["Dosa, plain", 168, 3.9, 29.0, 3.7, EST, ["dosa", "dosai"], [["1 dosa (85 g)", "piece", 85]]],
  ["Sambar", 65, 3.0, 9.0, 2.0, EST, ["sambar", "sambhar"], [["1 katori (150 g)", "bowl", 150]]],
  ["Khichdi", 120, 4.5, 20.0, 2.5, EST, ["khichdi", "khichri"], [["1 katori (150 g)", "bowl", 150]]],
  ["Bread, whole wheat", 247, 13.0, 41.3, 3.4, USDA, ["brown bread", "whole wheat bread", "atta bread"], [["1 slice (28 g)", "slice", 28]]],
  ["Bread, white", 265, 9.0, 49.0, 3.2, USDA, ["bread", "white bread", "double roti"], [["1 slice (25 g)", "slice", 25]]],
  ["Banana", 89, 1.1, 22.8, 0.3, USDA, ["banana", "kela"], [["1 medium (118 g)", "piece", 118]]],
  ["Apple", 52, 0.3, 13.8, 0.2, USDA, ["apple", "seb", "saib"], [["1 medium (182 g)", "piece", 182]]],
  ["Orange", 47, 0.9, 11.8, 0.1, USDA, ["orange", "santra", "narangi"], [["1 medium (130 g)", "piece", 130]]],
  ["Mango", 60, 0.8, 15.0, 0.4, USDA, ["mango", "aam"], [["1 cup sliced (165 g)", "cup", 165]]],
  ["Papaya", 43, 0.5, 10.8, 0.3, USDA, ["papaya", "papita"], [["1 cup (145 g)", "cup", 145]]],
  ["Grapes", 69, 0.7, 18.1, 0.2, USDA, ["grapes", "angoor"], [["1 cup (151 g)", "cup", 151]]],
  ["Potato (boiled)", 87, 1.9, 20.1, 0.1, USDA, ["potato", "aloo", "alu"], [["1 medium (150 g)", "piece", 150]]],
  ["Sweet potato (boiled)", 76, 1.4, 17.7, 0.1, USDA, ["sweet potato", "shakarkandi"], []],
  ["Spinach (raw)", 23, 2.9, 3.6, 0.4, USDA, ["spinach", "palak"], []],
  ["Onion (raw)", 40, 1.1, 9.3, 0.1, USDA, ["onion", "pyaz", "pyaaz", "kanda"], [["1 medium (110 g)", "piece", 110]]],
  ["Tomato (raw)", 18, 0.9, 3.9, 0.2, USDA, ["tomato", "tamatar"], [["1 medium (123 g)", "piece", 123]]],
  ["Cucumber (raw)", 15, 0.7, 3.6, 0.1, USDA, ["cucumber", "kheera", "kakdi"], []],
  ["Broccoli (raw)", 34, 2.8, 6.6, 0.4, USDA, ["broccoli"], []],
  ["Mixed vegetable sabzi", 90, 2.5, 9.0, 5.0, EST, ["sabzi", "sabji", "mixed veg", "vegetables", "bhaji"], [["1 katori (150 g)", "bowl", 150]]],
  ["Tofu, firm", 144, 17.3, 2.8, 8.7, USDA, ["tofu"], []],
  ["Soya chunks (dry)", 345, 52.0, 33.0, 0.5, "Label typical", ["soya chunks", "soy chunks", "nutrela"], []],
  ["Whey protein (generic)", 400, 80.0, 8.0, 6.0, "Label typical — check your brand", ["whey", "protein powder", "protein shake"], [["1 scoop (30 g)", "scoop", 30]]],
  ["Peanuts", 567, 25.8, 16.1, 49.2, USDA, ["peanuts", "moongfali", "mungfali", "groundnut"], []],
  ["Peanut butter", 588, 25.1, 20.0, 50.4, USDA, ["peanut butter"], [["1 tbsp (16 g)", "tbsp", 16]]],
  ["Almonds", 579, 21.2, 21.6, 49.9, USDA, ["almonds", "badam"], [["10 almonds (12 g)", "serving", 12]]],
  ["Ghee", 900, 0, 0, 100, USDA, ["ghee", "desi ghee"], [["1 tsp (5 g)", "tsp", 5], ["1 tbsp (13 g)", "tbsp", 13]]],
  ["Cooking oil", 884, 0, 0, 100, USDA, ["oil", "tel", "cooking oil"], [["1 tsp (4.5 g)", "tsp", 4.5], ["1 tbsp (13.5 g)", "tbsp", 13.5]]],
  ["Butter", 717, 0.9, 0.1, 81.1, USDA, ["butter", "makhan"], [["1 tsp (5 g)", "tsp", 5]]],
  ["Sugar", 387, 0, 100, 0, USDA, ["sugar", "cheeni", "chini"], [["1 tsp (4 g)", "tsp", 4]]],
  ["Masala chai (milk + sugar)", 50, 1.5, 7.0, 1.6, EST, ["chai", "tea", "masala chai"], [["1 cup (150 ml)", "cup", 150]], "ml"],
];

type E = [string, string, string, string, string]; // name, muscle, equipment, tracking, instructions
const EXERCISES: E[] = [
  ["Barbell Bench Press", "Chest", "Barbell", "weight_reps", "Lie on a flat bench, grip slightly wider than shoulders, lower the bar to mid-chest and press back up with control."],
  ["Incline Dumbbell Press", "Chest", "Dumbbell", "weight_reps", "On a 30–45° incline, press dumbbells up over the upper chest, lower slowly to chest level."],
  ["Push Up", "Chest", "Bodyweight", "reps", "Hands under shoulders, body straight, lower chest to the floor and push back up."],
  ["Chest Fly (Machine)", "Chest", "Machine", "weight_reps", "Sit tall, bring handles together in an arc squeezing the chest, return slowly."],
  ["Cable Crossover", "Chest", "Cable", "weight_reps", "Step forward, pull cables down and together in front of the hips, control the return."],
  ["Deadlift", "Back", "Barbell", "weight_reps", "Hinge at the hips with a flat back, drive through the floor to stand tall, lower under control."],
  ["Pull Up", "Back", "Bodyweight", "reps", "Hang from a bar, pull chest toward the bar driving elbows down, lower fully."],
  ["Lat Pulldown", "Back", "Cable", "weight_reps", "Pull the bar to upper chest, elbows down and back, return with control."],
  ["Barbell Row", "Back", "Barbell", "weight_reps", "Hinge forward, row the bar to your lower ribs, squeeze shoulder blades, lower slowly."],
  ["Seated Cable Row", "Back", "Cable", "weight_reps", "Sit tall, row the handle to your stomach, keep chest up, extend arms slowly."],
  ["One-Arm Dumbbell Row", "Back", "Dumbbell", "weight_reps", "Support on a bench, row the dumbbell to the hip, lower with a stretch."],
  ["Overhead Press", "Shoulders", "Barbell", "weight_reps", "Press the bar from shoulders to overhead, keep core braced, lower to collarbone."],
  ["Dumbbell Shoulder Press", "Shoulders", "Dumbbell", "weight_reps", "Seated or standing, press dumbbells overhead, lower to ear level."],
  ["Lateral Raise", "Shoulders", "Dumbbell", "weight_reps", "Raise dumbbells out to the sides to shoulder height with soft elbows, lower slowly."],
  ["Face Pull", "Shoulders", "Cable", "weight_reps", "Pull rope toward your face, elbows high, rotate hands back."],
  ["Barbell Curl", "Arms", "Barbell", "weight_reps", "Curl the bar up keeping elbows by your sides, lower fully."],
  ["Dumbbell Hammer Curl", "Arms", "Dumbbell", "weight_reps", "Neutral grip, curl dumbbells up, lower slowly."],
  ["Triceps Pushdown", "Arms", "Cable", "weight_reps", "Elbows pinned, push the bar or rope down until arms are straight."],
  ["Overhead Triceps Extension", "Arms", "Dumbbell", "weight_reps", "Hold a dumbbell overhead, lower behind the head, extend back up."],
  ["Dips", "Arms", "Bodyweight", "reps", "On parallel bars, lower until elbows reach 90°, press back up."],
  ["Back Squat", "Legs", "Barbell", "weight_reps", "Bar on upper back, sit down and back to depth with a neutral spine, drive up."],
  ["Leg Press", "Legs", "Machine", "weight_reps", "Feet shoulder-width on the platform, lower until knees ~90°, press back."],
  ["Romanian Deadlift", "Legs", "Barbell", "weight_reps", "Soft knees, hinge at hips sliding the bar down thighs, feel hamstrings, stand up."],
  ["Walking Lunge", "Legs", "Dumbbell", "weight_reps", "Step forward and lower the back knee toward the floor, alternate legs."],
  ["Leg Extension", "Legs", "Machine", "weight_reps", "Extend knees to straighten legs, squeeze quads, lower slowly."],
  ["Leg Curl", "Legs", "Machine", "weight_reps", "Curl the pad toward your glutes, control the return."],
  ["Hip Thrust", "Legs", "Barbell", "weight_reps", "Upper back on bench, drive hips up squeezing glutes, lower."],
  ["Standing Calf Raise", "Legs", "Machine", "weight_reps", "Rise onto your toes, pause, lower into a full stretch."],
  ["Plank", "Core", "Bodyweight", "time", "Forearms under shoulders, body straight, brace your core and hold."],
  ["Hanging Leg Raise", "Core", "Bodyweight", "reps", "Hang from a bar and raise legs with control, avoid swinging."],
  ["Cable Crunch", "Core", "Cable", "weight_reps", "Kneel, crunch down bringing elbows toward knees, return slowly."],
  ["Crunch", "Core", "Bodyweight", "reps", "Lie on your back, curl shoulders toward hips, lower slowly."],
  ["Treadmill Run", "Cardio", "Machine", "distance", "Run or walk at a steady pace. Log distance and time."],
  ["Cycling", "Cardio", "Machine", "distance", "Steady cycling on a bike or stationary bike."],
  ["Rowing Machine", "Cardio", "Machine", "distance", "Drive with legs, then lean back and pull, return in reverse order."],
  ["Jump Rope", "Cardio", "Other", "time", "Light bounces on the balls of your feet, turning the rope with wrists."],
  ["Burpee", "Full Body", "Bodyweight", "reps", "Squat, kick back to plank, push up, jump feet in and jump up."],
  ["Kettlebell Swing", "Full Body", "Kettlebell", "weight_reps", "Hinge and swing the bell to chest height using hip drive."],
  ["Clean and Press", "Full Body", "Barbell", "weight_reps", "Pull the bar to shoulders in one motion, then press overhead."],
];

export async function seedFoods() {
  const now = new Date().toISOString();
  for (const [name, kcal, p, c, f, source, aliases, servings, basis] of FOODS) {
    const r = await db.run(
      "INSERT INTO food_items(name,basis,kcal,protein,carbs,fat,source,is_custom,created_at) VALUES(?,?,?,?,?,?,?,0,?)",
      [name, basis ?? "g", kcal, p, c, f, source, now],
    );
    for (const a of aliases) await db.run("INSERT INTO food_aliases(food_id,alias) VALUES(?,?)", [r.id, a]);
    for (const [label, unit, grams] of servings)
      await db.run("INSERT INTO food_servings(food_id,label,unit,grams) VALUES(?,?,?,?)", [r.id, label, unit, grams]);
  }
}

export async function seedExercises() {
  for (const [name, muscle, equipment, tracking, instructions] of EXERCISES)
    await db.run("INSERT INTO exercises(name,muscle,equipment,tracking,instructions,is_custom) VALUES(?,?,?,?,?,0)", [
      name, muscle, equipment, tracking, instructions,
    ]);
}
