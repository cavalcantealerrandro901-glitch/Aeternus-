const express = require('express');
const passport = require('passport');
const router = express.Router();

// Inicia o login do Discord
router.get('/discord', passport.authenticate('discord'));

// Retorno do Discord após autorizar
router.get('/discord/callback', passport.authenticate('discord', {
    failureRedirect: '/'
}), (req, res) => {
    res.redirect('/dashboard');
});

// Logout
router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/');
    });
});

module.exports = router;
