const express = require('express');
const app=express();
const userModel = require('./modules/user');
const postModel = require('./modules/post');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const post = require('./modules/post');

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


app.get('/', (req, res) => {
  res.render('index');
});


app.post('/create', async (req, res) => {
    let { username, name, password, email, age } = req.body;
    if (!username || !name || !password || !email || !age) {
        return res.status(400).send("All fields are required");
    }
    let userExists = await userModel.findOne({ email });
    if (userExists) {
        return res.status(400).send("User already exists");
    }
    try {
        let hash = await bcrypt.hash(password, 10);
        let createdUser = await userModel.create({
            username,
            name,
            password: hash, // Store the hashed password
            email,
            age: parseInt(age, 10)
        });
        let token = jwt.sign({ email }, "secretKey"); // Sign the token with a secret key
        res.cookie('token', token);// Set the token in a cookie
        res.send(createdUser);
    } catch (err) {
        res.status(500).send("Error creating user");
    }
});


app.get('/login', async (req, res) => { // Render the login page
    res.render('login');
});

app.post('/login', async function (req, res) {
    let { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).send("Email and password are required");
    }
    // Check if the user exists
     let user = await userModel.findOne({ email });
    if (!user) return res.send('User not found');

    // If user exists, compare the provided password with the stored hashed password
    bcrypt.compare(req.body.password, user.password, (err, result) => { //give output of true or false
        //console.log(result);
        if (result){
            let token = jwt.sign({email: user.email}, "secretKey"); // Sign the token with a secret key
            res.cookie('token', token); // Set the token in a cookie
            res.redirect('/profile'); // Redirect to the profile page
        }
        // else return res.send('Invalid password or email');
        else res.redirect('/login'); // Redirect to login page if password is incorrect
});
});

app.get('/logout', (req, res) => {
    res.clearCookie('token'); // Clear the token cookie
    res.redirect('/login'); // Redirect to the home page
});

app.get('/profile', isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email }).populate('posts');
    res.render('profile', { user }); // Render the profile page with user data, user gets the data from the token and sends it to the profile page
})

app.get('/like/:id', isLoggedIn, async (req, res) => {
  let post = await postModel.findOne({ _id: req.params.id }).populate('user');

  if (post.likes.indexOf(req.user.id) === -1 ) {
    post.likes.push(req.user.id); // Add like
  } else {
    post.likes.splice(post.likes.indexOf(req.user.id), 1); // Remove like
  }
  await post.save();
  res.redirect('/profile'); // ✅ Proper redirect
});


app.get("/delete/:id", isLoggedIn, async (req, res) => {
    let post = await postModel.findOneAndDelete({ _id: req.params.id });
    if (!post) {
        return res.status(404).send("Post not found");
    }
    await userModel.updateOne({ _id: post.user }, { $pull: { posts: post._id } });
    console.log("Post deleted successfully");
    res.redirect('/profile'); // Redirect to profile after deletion
});

app.get('/edit/:id', isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({ _id: req.params.id }).populate('user');

    res.render('edit', {post}); // Render the edit page with the post data
});


  app.post('/update/:id', isLoggedIn, async (req, res) => {
  let post = await postModel.findOneAndUpdate({ _id: req.params.id }, {content: req.body.content})
  if (!post) {
      return res.status(404).send("Post not found");
  }
  res.redirect('/profile'); // Redirect to the profile page after updating the post
  });



function isLoggedIn(req, res, next) {
    const token = req.cookies.token;

    // Check if token exists
    if (!token) {
        return res.redirect('/login'); // Redirect to login if no token is found
    }

    try {
        const data = jwt.verify(token, "secretKey");
        req.user = data;
        next();
    } catch (err) {
        return res.status(401).send("Invalid or expired token");
    }
}

app.post('/createpost', isLoggedIn, async (req, res) => {
let user = await userModel.findOne({ email: req.user.email });
let {content} = req.body;
let post = await postModel.create({
    user: user._id,
    content
});
user.posts.push(post._id);
await user.save();
res.redirect('/profile'); // Redirect to the profile page after creating the post
});


app.listen(3000);