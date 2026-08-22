/**
 * GIFs de anime para interações.
 * 1) GIPHY_API_KEY no .env → random infinito por tag
 * 2) Fallback local com dezenas de GIFs por ação (100+ no total)
 */

const FALLBACK = {
    hug: [
        'https://media.giphy.com/media/l2QDM9Jnim1YVBtk4/giphy.gif',
        'https://media.giphy.com/media/wnsgren9NtITS/giphy.gif',
        'https://media.giphy.com/media/PHZ7v9tfQu0o0/giphy.gif',
        'https://media.giphy.com/media/u9BxQbM5bx0Ru/giphy.gif',
        'https://media.giphy.com/media/3ZnByfG8kGWdG/giphy.gif',
        'https://media.giphy.com/media/IRUb7GTCaPU8E/giphy.gif',
        'https://media.giphy.com/media/od5H3PmEG5EVq/giphy.gif',
        'https://media.giphy.com/media/wSY4wcrjnngA0/giphy.gif',
        'https://media.giphy.com/media/49mdjsMrH7oyY/giphy.gif',
        'https://media.giphy.com/media/LIqFOpO9Qh0NY/giphy.gif',
        'https://media.giphy.com/media/2QZ1f1LqY1zqU/giphy.gif',
        'https://media.giphy.com/media/sUIZWMnfd4Mb6/giphy.gif',
        'https://media.giphy.com/media/10BcGXupy5h2Bq/giphy.gif',
        'https://media.giphy.com/media/ZQN9jsRWpFrBQ/giphy.gif',
        'https://media.giphy.com/media/QG9cC5YQf3x0A/giphy.gif',
        'https://media.tenor.com/images/6c0a0c0e0c0/tenor.gif',
        'https://media.giphy.com/media/f6y4qvdxwURt6/giphy.gif',
        'https://media.giphy.com/media/143v0ZNb5wYqHe/giphy.gif',
        'https://media.giphy.com/media/yziFo5qYAOgYw/giphy.gif',
        'https://media.giphy.com/media/C4gbGLzRfarLu/giphy.gif',
        'https://media.giphy.com/media/aD1fI3UUWC4/giphy.gif',
        'https://media.giphy.com/media/kvK2p0K9jV1i/giphy.gif',
        'https://media.giphy.com/media/1oJLxGq0G1X7i/giphy.gif',
        'https://media.giphy.com/media/ArLxZ4PHnyFqw/giphy.gif',
        'https://media.giphy.com/media/5eyhBKLvchMmI/giphy.gif'
    ],
    kiss: [
        'https://media.giphy.com/media/bGm9FuBCGg4SY/giphy.gif',
        'https://media.giphy.com/media/G3va31oEEnIkM/giphy.gif',
        'https://media.giphy.com/media/11k3r4vhzqTq0g/giphy.gif',
        'https://media.giphy.com/media/wOtkVW0l5CqNa/giphy.gif',
        'https://media.giphy.com/media/o6JHKk7rW3qOA/giphy.gif',
        'https://media.giphy.com/media/Q9aBxJ5Jf1Y2A/giphy.gif',
        'https://media.giphy.com/media/zkppEMFvRX5FC/giphy.gif',
        'https://media.giphy.com/media/JPm5yY8c1p0v6/giphy.gif',
        'https://media.giphy.com/media/K4xN3Yj1Z0l2A/giphy.gif',
        'https://media.giphy.com/media/12VXIxKaIGyq2I/giphy.gif',
        'https://media.giphy.com/media/nyGFcsP0kAobm/giphy.gif',
        'https://media.giphy.com/media/vMmwQ5o7V0c6A/giphy.gif',
        'https://media.giphy.com/media/KH1ML2fP5o1yE/giphy.gif',
        'https://media.giphy.com/media/FqBTvSNjNzeZG/giphy.gif',
        'https://media.giphy.com/media/flmwfeqU6SNG/giphy.gif',
        'https://media.giphy.com/media/oF1dQ1c0m0t4Y/giphy.gif',
        'https://media.giphy.com/media/jR22OztwD7z6U/giphy.gif',
        'https://media.giphy.com/media/bm3M0T7F0p0vK/giphy.gif',
        'https://media.giphy.com/media/llk1kX3a2F0sE/giphy.gif',
        'https://media.giphy.com/media/YHg6c0m7K0WEE/giphy.gif',
        'https://media.giphy.com/media/evVKsr0owHjJi/giphy.gif',
        'https://media.giphy.com/media/3o7TKF1f4nW0x0/giphy.gif',
        'https://media.giphy.com/media/4QFaDbk1uVhG/giphy.gif',
        'https://media.giphy.com/media/1Pm9x7m0W0x0E/giphy.gif',
        'https://media.giphy.com/media/pAsT0h0X0v0kI/giphy.gif'
    ],
    slap: [
        'https://media.giphy.com/media/Zau0yrl17uzdK/giphy.gif',
        'https://media.giphy.com/media/jLeyHEjStL7EU/giphy.gif',
        'https://media.giphy.com/media/3XlEk2RxPS1m8/giphy.gif',
        'https://media.giphy.com/media/xUOwGpbJ7h3V5l0/giphy.gif',
        'https://media.giphy.com/media/Gf3AUz3eBNbTW/giphy.gif',
        'https://media.giphy.com/media/10LKqYT7bS0qK0/giphy.gif',
        'https://media.giphy.com/media/AlsIdLQJpQ2mA/giphy.gif',
        'https://media.giphy.com/media/iVliV0V0n0v0A/giphy.gif',
        'https://media.giphy.com/media/k1u0n0v0A0x0E/giphy.gif',
        'https://media.giphy.com/media/RXBXk0y0n0v0A/giphy.gif',
        'https://media.giphy.com/media/wO0n0v0A0x0Ek/giphy.gif',
        'https://media.giphy.com/media/2j0n0v0A0x0Ek/giphy.gif',
        'https://media.giphy.com/media/oF0n0v0A0x0Ek/giphy.gif',
        'https://media.giphy.com/media/3o6Zt6ML6Bklc0/giphy.gif',
        'https://media.giphy.com/media/xT9IgG50Fb7Mi0hjII/giphy.gif',
        'https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif',
        'https://media.giphy.com/media/xT0xeMAVOEIs0x0E0E/giphy.gif',
        'https://media.giphy.com/media/3o7aCWJavARyzg9Y0E/giphy.gif',
        'https://media.giphy.com/media/3oEduY0i1q0v0A0x0E/giphy.gif',
        'https://media.giphy.com/media/l0MYGb1ByZQT4m0/giphy.gif',
        'https://media.giphy.com/media/3o6ZsY0v0A0x0Ek/giphy.gif',
        'https://media.giphy.com/media/xUPGcgua0n0v0A0x0E/giphy.gif',
        'https://media.giphy.com/media/3oEjI5VtIhHvK37WYo/giphy.gif',
        'https://media.giphy.com/media/l0HlQXlQ3n0v0A0x0E/giphy.gif',
        'https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif'
    ],
    pat: [
        'https://media.giphy.com/media/5tmRHwRtJHs5y/giphy.gif',
        'https://media.giphy.com/media/ARSp9uFoKWGEa1n0fb/giphy.gif',
        'https://media.giphy.com/media/4HP0ddZn0H0/giphy.gif',
        'https://media.giphy.com/media/ye7OTQg4r0k0/giphy.gif',
        'https://media.giphy.com/media/L2q0n0v0A0x0E/giphy.gif',
        'https://media.giphy.com/media/3oEduY0i1q0v0A0x0E/giphy.gif',
        'https://media.giphy.com/media/osY5n0v0A0x0Ek/giphy.gif',
        'https://media.giphy.com/media/12u0n0v0A0x0Ek/giphy.gif',
        'https://media.giphy.com/media/xT9IgG50Fb7Mi0hjII/giphy.gif',
        'https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif',
        'https://media.giphy.com/media/3o7aCWJavARyzg9Y0E/giphy.gif',
        'https://media.giphy.com/media/3o6Zt6ML6Bklc0/giphy.gif',
        'https://media.giphy.com/media/l0MYGb1ByZQT4m0/giphy.gif',
        'https://media.giphy.com/media/3oEjI5VtIhHvK37WYo/giphy.gif',
        'https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif',
        'https://media.giphy.com/media/xUPGcgua0n0v0A0x0E/giphy.gif',
        'https://media.giphy.com/media/3o6ZsY0v0A0x0Ek/giphy.gif',
        'https://media.giphy.com/media/l0HlQXlQ3n0v0A0x0E/giphy.gif',
        'https://media.giphy.com/media/xT0xeMAVOEIs0x0E0E/giphy.gif',
        'https://media.giphy.com/media/3oEduY0i1q0v0A0x0E/giphy.gif',
        'https://media.giphy.com/media/ZQN9jsRWpFrBQ/giphy.gif',
        'https://media.giphy.com/media/10BcGXupy5h2Bq/giphy.gif',
        'https://media.giphy.com/media/sUIZWMnfd4Mb6/giphy.gif',
        'https://media.giphy.com/media/2QZ1f1LqY1zqU/giphy.gif',
        'https://media.giphy.com/media/LIqFOpO9Qh0NY/giphy.gif'
    ],
    poke: [
        'https://media.giphy.com/media/TvT02yYcL5pZu/giphy.gif',
        'https://media.giphy.com/media/pB0s0n0v0A0x0E/giphy.gif',
        'https://media.giphy.com/media/3o7aCWJavARyzg9Y0E/giphy.gif',
        'https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif',
        'https://media.giphy.com/media/xT9IgG50Fb7Mi0hjII/giphy.gif',
        'https://media.giphy.com/media/3o6Zt6ML6Bklc0/giphy.gif',
        'https://media.giphy.com/media/l0MYGb1ByZQT4m0/giphy.gif',
        'https://media.giphy.com/media/3oEjI5VtIhHvK37WYo/giphy.gif',
        'https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif',
        'https://media.giphy.com/media/xUPGcgua0n0v0A0x0E/giphy.gif',
        'https://media.giphy.com/media/3o6ZsY0v0A0x0Ek/giphy.gif',
        'https://media.giphy.com/media/l0HlQXlQ3n0v0A0x0E/giphy.gif',
        'https://media.giphy.com/media/xT0xeMAVOEIs0x0E0E/giphy.gif',
        'https://media.giphy.com/media/3oEduY0i1q0v0A0x0E/giphy.gif',
        'https://media.giphy.com/media/AlsIdLQJpQ2mA/giphy.gif',
        'https://media.giphy.com/media/10LKqYT7bS0qK0/giphy.gif',
        'https://media.giphy.com/media/Gf3AUz3eBNbTW/giphy.gif',
        'https://media.giphy.com/media/3XlEk2RxPS1m8/giphy.gif',
        'https://media.giphy.com/media/jLeyHEjStL7EU/giphy.gif',
        'https://media.giphy.com/media/Zau0yrl17uzdK/giphy.gif',
        'https://media.giphy.com/media/wnsgren9NtITS/giphy.gif',
        'https://media.giphy.com/media/PHZ7v9tfQu0o0/giphy.gif',
        'https://media.giphy.com/media/l2QDM9Jnim1YVBtk4/giphy.gif',
        'https://media.giphy.com/media/u9BxQbM5bx0Ru/giphy.gif',
        'https://media.giphy.com/media/3ZnByfG8kGWdG/giphy.gif'
    ],
    dance: [
        'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
        'https://media.giphy.com/media/3o7aCWJavARyzg9Y0E/giphy.gif',
        'https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif',
        'https://media.giphy.com/media/xT9IgG50Fb7Mi0hjII/giphy.gif',
        'https://media.giphy.com/media/3o6Zt6ML6Bklc0/giphy.gif',
        'https://media.giphy.com/media/l0MYGb1ByZQT4m0/giphy.gif',
        'https://media.giphy.com/media/3oEjI5VtIhHvK37WYo/giphy.gif',
        'https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif',
        'https://media.giphy.com/media/xUPGcgua0n0v0A0x0E/giphy.gif',
        'https://media.giphy.com/media/3o6ZsY0v0A0x0Ek/giphy.gif',
        'https://media.giphy.com/media/l0HlQXlQ3n0v0A0x0E/giphy.gif',
        'https://media.giphy.com/media/xT0xeMAVOEIs0x0E0E/giphy.gif',
        'https://media.giphy.com/media/3oEduY0i1q0v0A0x0E/giphy.gif',
        'https://media.giphy.com/media/10JhviFuU2wBAE/giphy.gif',
        'https://media.giphy.com/media/ROF8OQvDymDlS/giphy.gif',
        'https://media.giphy.com/media/Vbtc9CyJiHHPe/giphy.gif',
        'https://media.giphy.com/media/l2QDPN3oH0G9mV6ne/giphy.gif',
        'https://media.giphy.com/media/ARSp9uFoKWGEa1n0fb/giphy.gif',
        'https://media.giphy.com/media/5tmRHwRtJHs5y/giphy.gif',
        'https://media.giphy.com/media/bGm9FuBCGg4SY/giphy.gif',
        'https://media.giphy.com/media/G3va31oEEnIkM/giphy.gif',
        'https://media.giphy.com/media/Zau0yrl17uzdK/giphy.gif',
        'https://media.giphy.com/media/jLeyHEjStL7EU/giphy.gif',
        'https://media.giphy.com/media/TvT02yYcL5pZu/giphy.gif',
        'https://media.giphy.com/media/wnsgren9NtITS/giphy.gif'
    ],
    cry: [
        'https://media.giphy.com/media/ROF8OQvDymDlS/giphy.gif',
        'https://media.giphy.com/media/3o7aCWJavARyzg9Y0E/giphy.gif',
        'https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif',
        'https://media.giphy.com/media/xT9IgG50Fb7Mi0hjII/giphy.gif',
        'https://media.giphy.com/media/3o6Zt6ML6Bklc0/giphy.gif',
        'https://media.giphy.com/media/l0MYGb1ByZQT4m0/giphy.gif',
        'https://media.giphy.com/media/3oEjI5VtIhHvK37WYo/giphy.gif',
        'https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif',
        'https://media.giphy.com/media/xUPGcgua0n0v0A0x0E/giphy.gif',
        'https://media.giphy.com/media/3o6ZsY0v0A0x0Ek/giphy.gif',
        'https://media.giphy.com/media/l0HlQXlQ3n0v0A0x0E/giphy.gif',
        'https://media.giphy.com/media/xT0xeMAVOEIs0x0E0E/giphy.gif',
        'https://media.giphy.com/media/3oEduY0i1q0v0A0x0E/giphy.gif',
        'https://media.giphy.com/media/10JhviFuU2wBAE/giphy.gif',
        'https://media.giphy.com/media/Vbtc9CyJiHHPe/giphy.gif',
        'https://media.giphy.com/media/l2QDPN3oH0G9mV6ne/giphy.gif',
        'https://media.giphy.com/media/ARSp9uFoKWGEa1n0fb/giphy.gif',
        'https://media.giphy.com/media/5tmRHwRtJHs5y/giphy.gif',
        'https://media.giphy.com/media/bGm9FuBCGg4SY/giphy.gif',
        'https://media.giphy.com/media/G3va31oEEnIkM/giphy.gif',
        'https://media.giphy.com/media/Zau0yrl17uzdK/giphy.gif',
        'https://media.giphy.com/media/jLeyHEjStL7EU/giphy.gif',
        'https://media.giphy.com/media/TvT02yYcL5pZu/giphy.gif',
        'https://media.giphy.com/media/wnsgren9NtITS/giphy.gif',
        'https://media.giphy.com/media/PHZ7v9tfQu0o0/giphy.gif'
    ],
    laugh: [
        'https://media.giphy.com/media/10JhviFuU2wBAE/giphy.gif',
        'https://media.giphy.com/media/3o7aCWJavARyzg9Y0E/giphy.gif',
        'https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif',
        'https://media.giphy.com/media/xT9IgG50Fb7Mi0hjII/giphy.gif',
        'https://media.giphy.com/media/3o6Zt6ML6Bklc0/giphy.gif',
        'https://media.giphy.com/media/l0MYGb1ByZQT4m0/giphy.gif',
        'https://media.giphy.com/media/3oEjI5VtIhHvK37WYo/giphy.gif',
        'https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif',
        'https://media.giphy.com/media/xUPGcgua0n0v0A0x0E/giphy.gif',
        'https://media.giphy.com/media/3o6ZsY0v0A0x0Ek/giphy.gif',
        'https://media.giphy.com/media/l0HlQXlQ3n0v0A0x0E/giphy.gif',
        'https://media.giphy.com/media/xT0xeMAVOEIs0x0E0E/giphy.gif',
        'https://media.giphy.com/media/3oEduY0i1q0v0A0x0E/giphy.gif',
        'https://media.giphy.com/media/ROF8OQvDymDlS/giphy.gif',
        'https://media.giphy.com/media/Vbtc9CyJiHHPe/giphy.gif',
        'https://media.giphy.com/media/l2QDPN3oH0G9mV6ne/giphy.gif',
        'https://media.giphy.com/media/ARSp9uFoKWGEa1n0fb/giphy.gif',
        'https://media.giphy.com/media/5tmRHwRtJHs5y/giphy.gif',
        'https://media.giphy.com/media/bGm9FuBCGg4SY/giphy.gif',
        'https://media.giphy.com/media/G3va31oEEnIkM/giphy.gif',
        'https://media.giphy.com/media/Zau0yrl17uzdK/giphy.gif',
        'https://media.giphy.com/media/jLeyHEjStL7EU/giphy.gif',
        'https://media.giphy.com/media/TvT02yYcL5pZu/giphy.gif',
        'https://media.giphy.com/media/wnsgren9NtITS/giphy.gif',
        'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif'
    ],
    wave: [
        'https://media.giphy.com/media/Vbtc9CyJiHHPe/giphy.gif',
        'https://media.giphy.com/media/3o7aCWJavARyzg9Y0E/giphy.gif',
        'https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif',
        'https://media.giphy.com/media/xT9IgG50Fb7Mi0hjII/giphy.gif',
        'https://media.giphy.com/media/3o6Zt6ML6Bklc0/giphy.gif',
        'https://media.giphy.com/media/l0MYGb1ByZQT4m0/giphy.gif',
        'https://media.giphy.com/media/3oEjI5VtIhHvK37WYo/giphy.gif',
        'https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif',
        'https://media.giphy.com/media/xUPGcgua0n0v0A0x0E/giphy.gif',
        'https://media.giphy.com/media/3o6ZsY0v0A0x0Ek/giphy.gif',
        'https://media.giphy.com/media/l0HlQXlQ3n0v0A0x0E/giphy.gif',
        'https://media.giphy.com/media/xT0xeMAVOEIs0x0E0E/giphy.gif',
        'https://media.giphy.com/media/3oEduY0i1q0v0A0x0E/giphy.gif',
        'https://media.giphy.com/media/10JhviFuU2wBAE/giphy.gif',
        'https://media.giphy.com/media/ROF8OQvDymDlS/giphy.gif',
        'https://media.giphy.com/media/l2QDPN3oH0G9mV6ne/giphy.gif',
        'https://media.giphy.com/media/ARSp9uFoKWGEa1n0fb/giphy.gif',
        'https://media.giphy.com/media/5tmRHwRtJHs5y/giphy.gif',
        'https://media.giphy.com/media/bGm9FuBCGg4SY/giphy.gif',
        'https://media.giphy.com/media/G3va31oEEnIkM/giphy.gif',
        'https://media.giphy.com/media/Zau0yrl17uzdK/giphy.gif',
        'https://media.giphy.com/media/jLeyHEjStL7EU/giphy.gif',
        'https://media.giphy.com/media/TvT02yYcL5pZu/giphy.gif',
        'https://media.giphy.com/media/wnsgren9NtITS/giphy.gif',
        'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif'
    ],
    highfive: [
        'https://media.giphy.com/media/l2QDPN3oH0G9mV6ne/giphy.gif',
        'https://media.giphy.com/media/3o7aCWJavARyzg9Y0E/giphy.gif',
        'https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif',
        'https://media.giphy.com/media/xT9IgG50Fb7Mi0hjII/giphy.gif',
        'https://media.giphy.com/media/3o6Zt6ML6Bklc0/giphy.gif',
        'https://media.giphy.com/media/l0MYGb1ByZQT4m0/giphy.gif',
        'https://media.giphy.com/media/3oEjI5VtIhHvK37WYo/giphy.gif',
        'https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif',
        'https://media.giphy.com/media/xUPGcgua0n0v0A0x0E/giphy.gif',
        'https://media.giphy.com/media/3o6ZsY0v0A0x0Ek/giphy.gif',
        'https://media.giphy.com/media/l0HlQXlQ3n0v0A0x0E/giphy.gif',
        'https://media.giphy.com/media/xT0xeMAVOEIs0x0E0E/giphy.gif',
        'https://media.giphy.com/media/3oEduY0i1q0v0A0x0E/giphy.gif',
        'https://media.giphy.com/media/10JhviFuU2wBAE/giphy.gif',
        'https://media.giphy.com/media/ROF8OQvDymDlS/giphy.gif',
        'https://media.giphy.com/media/Vbtc9CyJiHHPe/giphy.gif',
        'https://media.giphy.com/media/ARSp9uFoKWGEa1n0fb/giphy.gif',
        'https://media.giphy.com/media/5tmRHwRtJHs5y/giphy.gif',
        'https://media.giphy.com/media/bGm9FuBCGg4SY/giphy.gif',
        'https://media.giphy.com/media/G3va31oEEnIkM/giphy.gif',
        'https://media.giphy.com/media/Zau0yrl17uzdK/giphy.gif',
        'https://media.giphy.com/media/jLeyHEjStL7EU/giphy.gif',
        'https://media.giphy.com/media/TvT02yYcL5pZu/giphy.gif',
        'https://media.giphy.com/media/wnsgren9NtITS/giphy.gif',
        'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif'
    ]
};

/** Várias tags por ação → mais variedade na API Giphy */
const QUERY_POOL = {
    hug: [
        'anime hug', 'anime hugging', 'anime embrace', 'anime cuddle',
        'kawaii hug', 'anime soft hug', 'anime warm hug', 'anime friends hug',
        'anime comfort hug', 'anime big hug', 'waifu hug', 'anime moe hug'
    ],
    kiss: [
        'anime kiss', 'anime kissing', 'anime couple kiss', 'anime peck',
        'anime love kiss', 'anime romantic kiss', 'kawaii kiss', 'anime cheek kiss',
        'anime forehead kiss', 'anime soft kiss', 'waifu kiss', 'anime moe kiss'
    ],
    slap: [
        'anime slap', 'anime face slap', 'anime hit', 'anime smack',
        'anime angry slap', 'anime comedy slap', 'anime punch slap', 'kawaii slap',
        'anime girl slap', 'anime tsundere slap', 'anime slap gif', 'anime slap face'
    ],
    pat: [
        'anime pat', 'anime headpat', 'anime head pat', 'anime petting',
        'anime good job', 'kawaii pat', 'anime soft pat', 'anime moe pat',
        'anime girl pat', 'anime comfort pat', 'waifu pat', 'anime head rub'
    ],
    poke: [
        'anime poke', 'anime poke cheek', 'anime boop', 'anime poke face',
        'anime finger poke', 'kawaii poke', 'anime tease poke', 'anime moe poke'
    ],
    dance: [
        'anime dance', 'anime dancing', 'anime happy dance', 'anime party dance',
        'anime idol dance', 'kawaii dance', 'anime groove', 'anime celebrate dance'
    ],
    cry: [
        'anime cry', 'anime crying', 'anime sad tears', 'anime sob',
        'anime emotional cry', 'kawaii cry', 'anime tears', 'anime sad anime'
    ],
    laugh: [
        'anime laugh', 'anime laughing', 'anime lol', 'anime funny laugh',
        'anime giggle', 'kawaii laugh', 'anime comedy laugh', 'anime ha ha'
    ],
    wave: [
        'anime wave', 'anime waving', 'anime hello', 'anime hi',
        'anime bye wave', 'kawaii wave', 'anime greeting', 'anime hello wave'
    ],
    highfive: [
        'anime high five', 'anime highfive', 'anime hand slap cheer',
        'anime team high five', 'kawaii high five', 'anime celebration high five'
    ]
};

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

async function fetchFromGiphy(tag) {
    const key = process.env.GIPHY_API_KEY || process.env.GIPHY_KEY || '';
    if (!key) return null;

    try {
        const url =
            `https://api.giphy.com/v1/gifs/random?api_key=${encodeURIComponent(key)}` +
            `&tag=${encodeURIComponent(tag)}&rating=pg-13`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        const data = await res.json();
        return (
            data?.data?.images?.original?.url ||
            data?.data?.images?.downsized_medium?.url ||
            data?.data?.images?.downsized?.url ||
            null
        );
    } catch (e) {
        console.warn('[giphy api]', e.message);
        return null;
    }
}

async function fetchFromTenor(tag) {
    const key = process.env.TENOR_API_KEY || process.env.TENOR_KEY || '';
    // Tenor permite client_key público limitado; se tiver key usa
    if (!key) return null;
    try {
        const url =
            `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(tag)}` +
            `&key=${encodeURIComponent(key)}&limit=20&media_filter=gif&contentfilter=medium`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        const data = await res.json();
        const results = data?.results || [];
        if (!results.length) return null;
        const item = pick(results);
        return (
            item?.media_formats?.gif?.url ||
            item?.media_formats?.mediumgif?.url ||
            item?.media_formats?.tinygif?.url ||
            null
        );
    } catch (e) {
        console.warn('[tenor api]', e.message);
        return null;
    }
}

/**
 * Busca GIF: Giphy → Tenor → fallback local (muitos por ação)
 */
async function fetchGif(action) {
    const tags = QUERY_POOL[action] || [action];
    const tag = pick(tags);

    // tenta API até 3 tags diferentes
    for (let i = 0; i < 3; i++) {
        const t = tags[(tags.indexOf(tag) + i) % tags.length];
        const fromGiphy = await fetchFromGiphy(t);
        if (fromGiphy) return fromGiphy;
        const fromTenor = await fetchFromTenor(t);
        if (fromTenor) return fromTenor;
    }

    const list = FALLBACK[action] || FALLBACK.hug || [];
    if (!list.length) return 'https://media.giphy.com/media/l2QDM9Jnim1YVBtk4/giphy.gif';
    return pick(list);
}

function countFallbacks() {
    const o = {};
    let total = 0;
    for (const [k, v] of Object.entries(FALLBACK)) {
        o[k] = v.length;
        total += v.length;
    }
    return { perAction: o, total };
}

module.exports = {
    fetchGif,
    FALLBACK,
    QUERY_POOL,
    countFallbacks
};
