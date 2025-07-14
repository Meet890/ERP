// const JwtStrategy = require("passport-jwt").Strategy;
// const ExtractJwt = require("passport-jwt").ExtractJwt;
// const Faculty = require("../models/Faculty");
// const Student = require("../models/studentModel");
// const Admin = require("../models/Admin");

// const keys = require("./key");

// const opts = {};
// opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
// opts.secretOrKey = keys.secretOrKey;

// module.exports = (passport) => {
//   passport.use(
//     new JwtStrategy(opts, async (jwt_payload, done) => {
//       try {
//         const faculty = await Faculty.findById(jwt_payload.id);
//         const student = await Student.findById(jwt_payload.id);
//         const admin = await Admin.findById(jwt_payload.id);

//         if (faculty) {
//           return done(null, faculty);
//         } else if (student) {
//           return done(null, student);
//         } else if (admin) {
//           return done(null, admin);
//         } else {
//           return done(null, false);
//         }
//       } catch (err) {
//         return done(err, false);
//       }
//     })
//   );
// };

const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const Faculty = require("../models/Faculty");
const Student = require("../models/studentModel");
const Admin = require("../models/Admin");
const keys = require("./key");

const opts = {};
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = keys.secretOrKey;

module.exports = (passport) => {
  passport.use(
    new JwtStrategy(opts, async (jwt_payload, done) => {
      try {
        // Admin first
        const admin = await Admin.findById(jwt_payload.id);
        if (admin) return done(null, admin);

        // Then Student
        const student = await Student.findById(jwt_payload.id);
        if (student) return done(null, student);

        // Then Faculty
        const faculty = await Faculty.findById(jwt_payload.id);
        if (faculty) return done(null, faculty);

        return done(null, false);
      } catch (err) {
        return done(err, false);
      }
    })
  );
};
