require('dotenv').config();

const express = require('express');
const cors = require('cors');
const Joi = require('joi');
const crypto = require('crypto');
// const corsOptions = {
//     origin: ["http://localhost:3000"]
// };
const app = express();
app.use(cors());
app.use(express.json());

const settup = require('./settup.json');


const { MongoClient, ServerApiVersion, ReturnDocument } = require('mongodb');
let mongo_client, mongo_db;

async function initializeMongoDB() {
    mongo_client = new MongoClient(process.env.MONGO_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: true,
      },
    });
  
    try {
      await mongo_client.connect();
      mongo_db = mongo_client.db(process.env.DB_NAME)
      console.log("Connected to MongoDB");
    } catch (error) {
      console.error("Error connecting to MongoDB:", error);
      process.exit(1); // Exit if the connection fails
    }
  }


// VARIABLES
const branches = ['lns', 'gp', 'di'];
const usersCache = {'lns': {}, 'gp': {}, 'di': {}};
const usersCacheTTL = 24 * 3600 * 1000; // 24hr in miliseconds


// VALIDATION FUNCTIONS
function formatInitData(initDataUnsafe){
  initDataUnsafe.user.id = parseInt(initDataUnsafe.user.id, 10)
  initDataUnsafe.user.allows_write_to_pm = Boolean(initDataUnsafe.user.allows_write_to_pm)
  initDataUnsafe.auth_date = parseInt(initDataUnsafe.auth_date, 10)

  if (initDataUnsafe.user?.is_premium !== undefined) {
    initDataUnsafe.user.is_premium = Boolean(initDataUnsafe.user.is_premium);
  }

  if (initDataUnsafe.can_send_after){initDataUnsafe.can_send_after = parseInt(initDataUnsafe?.can_send_after, 10)}

  return initDataUnsafe
}

const validateInitData = (res, initDataUnsafe) => {
  const unixTime = Math.floor(Date.now() / 1000);

  if (process.env.ENV === 'PROD' && (unixTime - 3600) > initDataUnsafe.auth_date){
    res.status(401).send('Authorization expired')
    return false
  }

  const { hash, ...rest } = initDataUnsafe;

  const dataCheckString = Object.entries(rest).sort().map(([k, v]) => {
      if (typeof v === "object" && v !== null) {
          v = JSON.stringify(v);
      }

      if (typeof v === "string" && /(https?:\/\/[^\s]+)/.test(v)) {
          v = v.replace(/\//g, "\\/");
      }
      
      return `${k}=${v}`;
  }).join("\n");

  const secret = crypto.createHmac("sha256", "WebAppData").update(process.env.TOKEN);
  const calculatedHash = crypto.createHmac("sha256", secret.digest()).update(dataCheckString).digest("hex");
  
  if (calculatedHash === hash){
    return true
  } else {
    res.status(401).send('Unable to verify hash')
    return false
  }
};

const validateBranch = Joi.string().valid(...branches);
const validateUserId = Joi.number().integer().positive();
const validateColor = Joi.number().min(0).max(6).default(0);


// SUPPORT FUNCTIONS
async function isRotaAdmin(branch, user_id) {
  const userEntry = await mongo_db.collection('users').findOne(
    { telegram_id: user_id },
    { projection: {roles: 1} }
  );

  if (userEntry === null){
    return false
  }

  if (Object.hasOwn(userEntry.roles, `admin_rota_${branch}`)){
    return true;
  } else {
    return false;
  }
}


async function statistic(initDataUnsafe, action, sub_action = null, misc = null) {
  if (process.env.ENV === 'TEST') {
    return
  }

  const user_entry = await mongo_db.collection('users').findOne(
    {telegram_id: initDataUnsafe.user.id},
    {projection: {region: 1, _id: 0}}
  );

  const user_region = user_entry?.region ?? null;

  const new_entry = {
    date: new Date(),
    action: action,
    sub_action: sub_action,
    misc: misc,
    user_id: initDataUnsafe.user.id,
    username: initDataUnsafe.user.username,
    user_region: user_region,
  };

  console.log(new_entry);
  await mongo_db.collection('usageStatistics').insertOne(new_entry);
}


async function convertListRota(branch, data) {
    const result = {};

    for (let index = 0; index < 24; index++) {
      // Create the time range string
      const startHour = String(index).padStart(2, '0');
      const endHour = String(index + 1).padStart(2, '0');
      const timeRange = `${startHour}:00-${endHour}:00`;
  
      if (data && data[index]) {
        // Process user_ids asynchronously and convert them to usernames
        const userArray = [];
        await Promise.all(
          data[index].map(async (userId) => {
            const userObj = await convertUserId(branch, userId)
            userArray.push(userObj);
          })
        );

        result[timeRange] = userArray;
      } else {
        // Use an empty object if no data is available
        result[timeRange] = {};
      }
    }
  
    return result;
  }


async function convertUserId(branch, user_id) {
  // Check cache
  if (usersCache[branch][user_id]){
    return usersCache[branch][user_id];
  }

  // Get user from DB
  const userEntry = await mongo_db.collection('users').findOne(
    {telegram_id: user_id},
    {projection: {telegram: 1, roles: 1, _id: 0}}
  );


  if (userEntry === null) {
    return null;
  }

  // Save information to cache
  usersCache[branch][user_id] = {
    username: userEntry.telegram,
    nick: userEntry?.roles[`rota_${branch}`]?.nick ?? userEntry.telegram,
    color: userEntry?.roles[`rota_${branch}`]?.c ?? null,
  }

  // Self-destructing cache
  setTimeout(() => {
    delete usersCache[branch][user_id];
  }, usersCacheTTL);

  const userObj = usersCache[branch][user_id];
  userObj.id = user_id;

  return userObj;
}


// API
app.get("/api/ping", async (req, res) => {
  res.send('pong')
});


app.get("/api/auth", async (req, res) => {
  // Validation
  const validationSchema = Joi.object({
    initDataUnsafe: Joi.any().required()
  });

  const { error, value } = validationSchema.validate(req.query);
  if (error) return res.status(400).send(error.details[0].message);

  const initDataUnsafe = formatInitData(req.query.initDataUnsafe);
  if (! validateInitData(res, initDataUnsafe)){return}


  // Logic
  let rotaAdmin = [];
  let userBranches = {};
  let hasRoles = false;

  const userEntry = await mongo_db.collection('users').findOne(
    {telegram_id: initDataUnsafe.user.id},
    {projection: {roles: 1}}
  );

  if (userEntry === null){
    res.status(404).send("User not found")
    return
  }

  branches.forEach(branch => {
    const rotaKey = `rota_${branch}`;
    const adminKey = `admin_rota_${branch}`;

    // Check for rota keys and add to userBranches if present
    if (userEntry.roles[rotaKey] !== undefined) {
        userBranches[branch] = {
          color: userEntry.roles[rotaKey],
          maxDuties: settup[branch].maxDuties,
          minDate: settup[branch].minDate,
          maxDate: settup[branch].maxDate
        };

        hasRoles = true;
    }

    // Check for admin keys and add to rotaAdmin if present
    if (userEntry.roles[adminKey] !== undefined) {
        rotaAdmin.push(branch);
    }
  });


  if (! hasRoles){
    res.status(403).send("Forbidden")
  } else {
    res.json({branches: userBranches, rotaAdmin: rotaAdmin})
  }

})


app.get("/api/rota", async (req, res) => {
    // Validation
    const validationSchema = Joi.object({
      branch: validateBranch.required(),
      date: Joi.date().max(settup[req.query.branch].maxDate).min(settup[req.query.branch].minDate).required()
    });
  
    const { error, value } = validationSchema.validate(req.query);
    if (error) return res.status(400).send(error.details[0].message);

    // Logic
    const dayEntry = await mongo_db.collection(`rota_${value.branch}`).findOne({date: value.date});

    if (dayEntry === null){
      return res.status(404).send('Day not found')
    }

    if (['lns', 'gp', 'di'].includes(value.branch)){
        const result = await convertListRota(value.branch, dayEntry?.rota ?? {});
        return res.json(result)
    } else {
        return res.json({})
    }

})


app.get("/api/userDuties", async (req, res) => {
  // Validation
  const validationSchema = Joi.object({
    branch: validateBranch.required(),
    user_id: validateUserId.required(),
    startDate: Joi.date().max(settup[req.query.branch].maxDate).min(settup[req.query.branch].minDate).required(),
    endDate: Joi.date().max(settup[req.query.branch].maxDate).min(settup[req.query.branch].minDate).required()
  }).custom((value, helpers) => {
    if (value.startDate > value.endDate) {
      return helpers.message('startDate must be less than or equal to endDate');
    }
    return value;
  });

  const { error, value } = validationSchema.validate(req.query);
  if (error) return res.status(400).send(error.details[0].message);

  // Logic
  const cursor = mongo_db.collection(`rota_${value.branch}`).find(
    {
      '$and': [
        {'date': {'$gte': value.startDate}},
        {'date': {'$lte': value.endDate}}
      ],
      'rota': {'$elemMatch': {'$elemMatch': {'$eq': value.user_id}}}
    }
  );
  const dayArray = await cursor.toArray();

  const result = [];

  dayArray.forEach(dayEntry => {
    let dayDuties = {date: dayEntry.date, hours: []};

    dayEntry.rota.forEach((timeSlot, index) => {
      if (timeSlot.includes(value.user_id)){
        dayDuties.hours.push(index)
      }
    });

    result.push(dayDuties);
  });

  res.json(result);
})


app.get("/api/users", async (req, res) => {
  // Validation
  const validationSchema = Joi.object({
    branch: validateBranch.required(),
    initDataUnsafe: Joi.any().required()
  });

  const { error, value } = validationSchema.validate(req.query);
  if (error) return res.status(400).send(error.details[0].message);

  const initDataUnsafe = formatInitData(req.query.initDataUnsafe);
  if (! validateInitData(res, initDataUnsafe)){return};

  if (! await isRotaAdmin(value.branch, value.initDataUnsafe.user.id)) {
    return res.status(403).send('You must be a rota admin') 
  }

  // Logic
  const searchQuery = {[`roles.rota_${value.branch}`]: {$exists: true}};
  const userCount = await mongo_db.collection('users').countDocuments(searchQuery);

  if (Object.entries(usersCache[value.branch]).length !== userCount) {
    // Reset cache
    usersCache[value.branch] = {};

    // Fetch data
    const userCursor = mongo_db.collection('users').find(
      searchQuery,
      {projection: {'telegram_id': 1, 'telegram': 1, [`roles.rota_${value.branch}`]: 1, '_id': 0}}
    );
    const userArray = await userCursor.toArray();
    console.log('Users fetched');

    // Save to cache
    for (const user of userArray) {
      usersCache[value.branch][user.telegram_id] = {
        id: user.telegram_id,
        username: user.telegram,
        nick: user?.roles[`rota_${value.branch}`]?.nick ?? userEntry.telegram,
        color: user?.roles[`rota_${value.branch}`]?.c ?? null,
      };

      setTimeout(() => {
        delete usersCache[value.branch][user.telegram_id];
      }, usersCacheTTL);
    }
  }

  res.json(usersCache[value.branch])

})


app.post("/api/updateRota", async(req, res) => {
  // Validation
  const today = new Date();
  let timeIndex;

  const validationSchema = Joi.object({
    type: Joi.string().valid('remove', 'add').required(),
    branch: validateBranch.required(),
    date: Joi.date().max(settup[req.body.branch].maxDate).min(settup[req.body.branch].minDate).required(),
    timeRange: Joi.string().required(),
    modifyUserId: validateUserId.required(),
    initDataUnsafe: Joi.any().required()
  });

  const { error, value } = validationSchema.validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const initDataUnsafe = formatInitData(req.body.initDataUnsafe);
  if (! validateInitData(res, initDataUnsafe)){return};

  try {
    timeIndex = Number(value.timeRange.slice(0, 2));
  } catch (error){
    return res.status(400).send("Expect slice(0, 2) of time to be a Number")
  }


  // Logic
  let updatedDayEntry;

  if (value.type === 'remove'){
    // Only admins can remove users from rota
    if (! isRotaAdmin(value.branch, initDataUnsafe.user.id)){
      return res.status(403).send('You must be rota admin to remove users')
    }

    updatedDayEntry = await mongo_db.collection(`rota_${value.branch}`).findOneAndUpdate(
      {date: value.date},
      {"$pull": {[`rota.${timeIndex}`]: value.modifyUserId}},
      {
        returnDocument: 'after'
      }
    )


  } else if (value.type === 'add'){
    // Only admins can add someone else to rota
    if (value.modifyUserId != initDataUnsafe.user.id && ! isRotaAdmin(value.branch, initDataUnsafe.user.id)){
      return res.status(403).send('You must be rota admin to add someone else')
    }

    dayEntry = await mongo_db.collection(`rota_${value.branch}`).findOne(
      {date: value.date}
    );

    const timeSlot = dayEntry.rota[timeIndex];

    if (!timeSlot.includes(value.modifyUserId)) {
      timeSlot.push(value.modifyUserId);
    };

    updatedDayEntry = await mongo_db.collection(`rota_${value.branch}`).findOneAndUpdate(
      {_id: dayEntry._id},
      {"$set": {[`rota.${timeIndex}`]: timeSlot}},
      {
        returnDocument: 'after'
      }
    );
  }


  if (updatedDayEntry === null){
    res.status(404).send("Date not found")
    return
  } else {
    res.json(await convertListRota(value.branch, updatedDayEntry.rota))
    await statistic(initDataUnsafe, value.branch.toUpperCase(), `rota-${value.type}`, {date: value.date, time: value.timeRange, modify: value.modifyUserId})
    return
  };
})


app.post("/api/removeUser", async(req, res) => {
  // Validation
  const validationSchema = Joi.object({
    branch: validateBranch.required(),
    modifyUserId: validateUserId.required(),
    initDataUnsafe: Joi.any().required()
  });

  const { error, value } = validationSchema.validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const initDataUnsafe = formatInitData(req.body.initDataUnsafe);
  if (! validateInitData(res, initDataUnsafe)){return};

  if (! await isRotaAdmin(value.branch, initDataUnsafe.user.id)) {
    res.status(403).send('You must be a rota admin')
    return 
  }

  // Logic
  const updateUser = await mongo_db.collection('users').updateOne(
    {telegram_id: value.modifyUserId},
    {$unset: {[`roles.rota_${value.branch}`]: null}}
  )

  
  // Update cache
  delete usersCache[value.branch][value.modifyUserId]

  if (updateUser.matchedCount === 1){
    res.send('ok')
    await statistic(initDataUnsafe, value.branch.toUpperCase(), 'rota-remove-user', {modify: value.modifyUserId})
  } else {
    res.status(404).send("User not found")
  }

})


app.post("/api/updateUser", async(req, res) => {
  // Validation
  const validationSchema = Joi.object({
    branch: validateBranch.required(),
    modifyUserId: validateUserId.allow(null),
    modifyUsername: Joi.string(),
    nick: Joi.string().required(),
    color: validateColor,
    initDataUnsafe: Joi.any().required()
  }).or('modifyUserId', 'modifyUsername');

  const { error, value } = validationSchema.validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const initDataUnsafe = formatInitData(req.body.initDataUnsafe);
  if (! validateInitData(res, initDataUnsafe)){return};

  if (! await isRotaAdmin(value.branch, initDataUnsafe.user.id)) {
    res.status(403).send('You must be a rota admin')
    return 
  }

  // Logic
  let updateUser;
  const updateOptions = {
    projection: {telegram_id: 1, telegram: 1, [`roles.rota_${value.branch}`]: 1, _id: 0},
    returnDocument: 'after'
  };

  if (value.modifyUserId) {
    // Update permissions of user with current rota access
    updateUser = await mongo_db.collection('users').findOneAndUpdate(
      {telegram_id: value.modifyUserId},
      {
        $set: {
          [`roles.rota_${value.branch}`]: {
            nick: value.nick,
            c: value.color
          }
        }
      },
      updateOptions
    )

  } else if (!value.modifyUserId && value.modifyUsername) {
    // Add rota access to a user in DB
    updateUser = await mongo_db.collection('users').findOneAndUpdate(
      {telegram: value.modifyUsername},
      {
        $set: {
          [`roles.rota_${value.branch}`]: {
            nick: value.nick,
            c: value.color
          }
        }
      },
      updateOptions
    )
  }

  if (updateUser !== null){
    res.send('ok')
    await statistic(initDataUnsafe, value.branch.toUpperCase(), 'rota-update-user', {modify: value.modifyUserId, modify_username: value.modifyUsername, nick: value.nick, color: value.color,})
  } else {
    return res.status(404).send("User not found")
  }

  // Update cache
  usersCache[value.branch][updateUser.telegram_id] = {
    username: updateUser.telegram,
    nick: updateUser.roles[`rota_${value.branch}`]?.nick ?? updateUser.telegram,
    color: updateUser.roles[`rota_${value.branch}`]?.c ?? 0
  }


})


app.get("/api/stats", async (req, res) => {
  // Validation
  const validationSchema = Joi.object({
    branch: validateBranch.required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().required()
  }).custom((value, helpers) => {
    if (value.startDate > value.endDate) {
      return helpers.message('startDate must be less than or equal to endDate');
    }
    return value;
  });

  const { error, value } = validationSchema.validate(req.query);
  if (error) return res.status(400).send(error.details[0].message);

  // Logic
  const pipeline = [
    {
      '$match': {
        'date': {
          '$gte': value.startDate, 
          '$lte': value.endDate
        }
      }
    }, {
      '$unwind': {
        'path': '$rota'
      }
    }, {
      '$unwind': {
        'path': '$rota'
      }
    }, {
      '$group': {
        '_id': '$rota', 
        'count': {
          '$sum': 1
        }
      }
    }, {
      '$sort': {
        'count': -1
      }
    }
  ]

  const stats = await mongo_db.collection(`rota_${value.branch}`).aggregate(pipeline).toArray();
  const allUserIds = await mongo_db.collection('users').distinct('telegram_id', {
    [`roles.rota_${value.branch}`]: { $exists: true }
  });
  
  // Create a map for fast lookup of search result IDs
  const searchMap = new Map(stats.map(item => [item._id, item]));
  
  // Add missing IDs from userIds to search results with count 0
  allUserIds.forEach(id => {
    if (!searchMap.has(id)) {
      searchMap.set(id, { _id: id, count: 0 });
    }
  });
  
  // Convert the map back to an array
  const allStats = Array.from(searchMap.values());
  

  const usernameStats = await Promise.all(
    allStats.map(async ({ _id, count }) => {
      const userObj = await convertUserId(value.branch, _id);
      return { nick: userObj.nick, count };
    })
  );

  res.json(usernameStats);

})


// Start the server
initializeMongoDB().then(() => {
    app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  });

// Stoping server
process.on("SIGINT", async () => {
    console.log("Closing MongoDB connection...");
    await mongo_client.close();
    process.exit(0);
});
  