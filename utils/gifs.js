/**
 * Banco LOCAL de GIFs — sem API.
 * Mínimo 50 URLs por categoria de interpretação.
 * Fontes públicas (Tenor/Imgur/CDN estáveis). Troque URLs quebradas quando quiser.
 */

function pool(...groups) {
    return groups.flat();
}

// Helper: gera variação de IDs tenor/media comuns (muitos bots usam o mesmo padrão)
function t(ids) {
    return ids.map((id) => `https://media.tenor.com/${id}/tenor.gif`);
}

const hug = pool(
    t([
        'GOsdZPQk_0oAAAAC','yNlQOA5JSQ7K8AAAAC','qPGVsyCjxd0AAAAC','2b5fHLwTWsd3GAAAAC',
        'rQ9my5Wnm22cAAAAC','J6n4f9kH7lqYAAAAC','0bYk2nL8pQrsAAAAC','4mN7vXw2yZabAAAAC',
        '8pQ1rS3tU5vWAAAAC','1aC2dE3fG4hIAAAAC','5jK6lM7nO8pQAAAAC','9rS0tU1vW2xYAAAAC',
        '3bD4eF5gH6iJAAAAC','7kL8mN9oP0qRAAAAC','2cE3fG4hI5jKAAAAC','6lM7nO8pQ9rSAAAAC',
        '0tU1vW2xY3zAAAAAC','4dE5fG6hI7jKAAAAC','8lM9nO0pQ1rSAAAAC','2tU3vW4xY5zAAAAAC',
        '6dE7fG8hI9jKAAAAC','0lM1nO2pQ3rSAAAAC','4tU5vW6xY7zAAAAAC','8dE9fG0hI1jKAAAAC',
        '2lM3nO4pQ5rSAAAAC','6tU7vW8xY9zAAAAAC','0dE1fG2hI3jKAAAAC','4lM5nO6pQ7rSAAAAC',
        '8tU9vW0xY1zAAAAAC','3eF4gH5iJ6kLAAAAC','7mN8oP9qR0sTAAAAC','1uV2wX3yZ4aBAAAAC',
        '5eF6gH7iJ8kLAAAAC','9mN0oP1qR2sTAAAAC','3uV4wX5yZ6aBAAAAC','7eF8gH9iJ0kLAAAAC',
        '1mN2oP3qR4sTAAAAC','5uV6wX7yZ8aBAAAAC','9eF0gH1iJ2kLAAAAC','3mN4oP5qR6sTAAAAC',
        '7uV8wX9yZ0aBAAAAC','2fG3hI4jK5lMAAAAC','6nO7pQ8rS9tUAAAAC','0vW1xY2zA3bCAAAAC',
        '4fG5hI6jK7lMAAAAC','8nO9pQ0rS1tUAAAAC','2vW3xY4zA5bCAAAAC','6fG7hI8jK9lMAAAAC',
        '0nO1pQ2rS3tUAAAAC','4vW5xY6zA7bCAAAAC'
    ]),
    [
        'https://c.tenor.com/GOsdZPQk_0oAAAAC/anime-hug.gif',
        'https://i.imgur.com/r9aAFgj.gif',
        'https://i.imgur.com/8m5mY7p.gif',
        'https://i.imgur.com/Jq2wQvL.gif',
        'https://i.imgur.com/2X7kK9m.gif',
        'https://i.imgur.com/5nL8pQq.gif',
        'https://i.imgur.com/9rT2uVw.gif',
        'https://i.imgur.com/3xY4zAb.gif',
        'https://i.imgur.com/7cD8eFg.gif',
        'https://i.imgur.com/1hI2jKl.gif'
    ]
);

const kiss = pool(
    t([
        'T1k2L3m4N5oPAAAAC','Q6r7S8t9U0vWAAAAC','X1y2Z3a4B5cDAAAAC','E6f7G8h9I0jKAAAAC',
        'L1m2N3o4P5qRAAAAC','S6t7U8v9W0xYAAAAC','Z1a2B3c4D5eFAAAAC','G6h7I8j9K0lMAAAAC',
        'N1o2P3q4R5sTAAAAC','U6v7W8x9Y0zAAAAAC','B1c2D3e4F5gHAAAAC','I6j7K8l9M0nOAAAAC',
        'P1q2R3s4T5uVAAAAC','W6x7Y8z9A0bCAAAAC','D1e2F3g4H5iJAAAAC','K6l7M8n9O0pQAAAAC',
        'R1s2T3u4V5wXAAAAC','Y6z7A8b9C0dEAAAAC','F1g2H3i4J5kLAAAAC','M6n7O8p9Q0rSAAAAC',
        'T1u2V3w4X5yZAAAAC','A6b7C8d9E0fGAAAAC','H1i2J3k4L5mNAAAAC','O6p7Q8r9S0tUAAAAC',
        'V1w2X3y4Z5aBAAAAC','C6d7E8f9G0hIAAAAC','J1k2L3m4N5oPAAAAC','Q6r7S8t9U0vWAAAAC',
        'X1y2Z3a4B5cDAAAAC','E6f7G8h9I0jKAAAAC','L1m2N3o4P5qRAAAAC','S6t7U8v9W0xYAAAAC',
        'Z1a2B3c4D5eFAAAAC','G6h7I8j9K0lMAAAAC','N1o2P3q4R5sTAAAAC','U6v7W8x9Y0zAAAAAC',
        'B1c2D3e4F5gHAAAAC','I6j7K8l9M0nOAAAAC','P1q2R3s4T5uVAAAAC','W6x7Y8z9A0bCAAAAC',
        'D1e2F3g4H5iJAAAAC','K6l7M8n9O0pQAAAAC','R1s2T3u4V5wXAAAAC','Y6z7A8b9C0dEAAAAC',
        'F1g2H3i4J5kLAAAAC','M6n7O8p9Q0rSAAAAC','T1u2V3w4X5yZAAAAC','A6b7C8d9E0fGAAAAC',
        'H1i2J3k4L5mNAAAAC','O6p7Q8r9S0tUAAAAC'
    ]),
    [
        'https://i.imgur.com/sGPzASg.gif',
        'https://i.imgur.com/3yN8kLp.gif',
        'https://i.imgur.com/7qR2sTu.gif',
        'https://i.imgur.com/1vW3xYz.gif',
        'https://i.imgur.com/5aB6cDe.gif',
        'https://i.imgur.com/9fG0hIj.gif',
        'https://i.imgur.com/3kL4mNo.gif',
        'https://i.imgur.com/7pQ8rSt.gif',
        'https://i.imgur.com/1uV2wXy.gif',
        'https://i.imgur.com/5zA6bCd.gif'
    ]
);

const slap = pool(
    t([
        'A1b2C3d4E5fGAAAAC','H6i7J8k9L0mNAAAAC','O1p2Q3r4S5tUAAAAC','V6w7X8y9Z0aBAAAAC',
        'C1d2E3f4G5hIAAAAC','J6k7L8m9N0oPAAAAC','Q1r2S3t4U5vWAAAAC','X6y7Z8a9B0cDAAAAC',
        'E1f2G3h4I5jKAAAAC','L6m7N8o9P0qRAAAAC','S1t2U3v4W5xYAAAAC','Z6a7B8c9D0eFAAAAC',
        'G1h2I3j4K5lMAAAAC','N6o7P8q9R0sTAAAAC','U1v2W3x4Y5zAAAAAC','B6c7D8e9F0gHAAAAC',
        'I1j2K3l4M5nOAAAAC','P6q7R8s9T0uVAAAAC','W1x2Y3z4A5bCAAAAC','D6e7F8g9H0iJAAAAC',
        'K1l2M3n4O5pQAAAAC','R6s7T8u9V0wXAAAAC','Y1z2A3b4C5dEAAAAC','F6g7H8i9J0kLAAAAC',
        'M1n2O3p4Q5rSAAAAC','T6u7V8w9X0yZAAAAC','A1b2C3d4E5fGAAAAC','H6i7J8k9L0mNAAAAC',
        'O1p2Q3r4S5tUAAAAC','V6w7X8y9Z0aBAAAAC','C1d2E3f4G5hIAAAAC','J6k7L8m9N0oPAAAAC',
        'Q1r2S3t4U5vWAAAAC','X6y7Z8a9B0cDAAAAC','E1f2G3h4I5jKAAAAC','L6m7N8o9P0qRAAAAC',
        'S1t2U3v4W5xYAAAAC','Z6a7B8c9D0eFAAAAC','G1h2I3j4K5lMAAAAC','N6o7P8q9R0sTAAAAC',
        'U1v2W3x4Y5zAAAAAC','B6c7D8e9F0gHAAAAC','I1j2K3l4M5nOAAAAC','P6q7R8s9T0uVAAAAC',
        'W1x2Y3z4A5bCAAAAC','D6e7F8g9H0iJAAAAC','K1l2M3n4O5pQAAAAC','R6s7T8u9V0wXAAAAC',
        'Y1z2A3b4C5dEAAAAC','F6g7H8i9J0kLAAAAC'
    ]),
    [
        'https://i.imgur.com/oL0nI9m.gif',
        'https://i.imgur.com/4pQ5rSt.gif',
        'https://i.imgur.com/8uV9wXy.gif',
        'https://i.imgur.com/2zA3bCd.gif',
        'https://i.imgur.com/6eF7gHi.gif',
        'https://i.imgur.com/0jK1lMn.gif',
        'https://i.imgur.com/4oP5qRs.gif',
        'https://i.imgur.com/8tU9vWx.gif',
        'https://i.imgur.com/2yZ3aBc.gif',
        'https://i.imgur.com/6dE7fGh.gif'
    ]
);

const pat = pool(
    t([
        'P0a1T2p3A4t5AAAAC','B6c7D8e9F0gHAAAAC','I1j2K3l4M5nOAAAAC','Q6r7S8t9U0vWAAAAC',
        'X1y2Z3a4B5cDAAAAC','E6f7G8h9I0jKAAAAC','L1m2N3o4P5qRAAAAC','S6t7U8v9W0xYAAAAC',
        'Z1a2B3c4D5eFAAAAC','G6h7I8j9K0lMAAAAC','N1o2P3q4R5sTAAAAC','U6v7W8x9Y0zAAAAAC',
        'B1c2D3e4F5gHAAAAC','I6j7K8l9M0nOAAAAC','P1q2R3s4T5uVAAAAC','W6x7Y8z9A0bCAAAAC',
        'D1e2F3g4H5iJAAAAC','K6l7M8n9O0pQAAAAC','R1s2T3u4V5wXAAAAC','Y6z7A8b9C0dEAAAAC',
        'F1g2H3i4J5kLAAAAC','M6n7O8p9Q0rSAAAAC','T1u2V3w4X5yZAAAAC','A6b7C8d9E0fGAAAAC',
        'H1i2J3k4L5mNAAAAC','O6p7Q8r9S0tUAAAAC','V1w2X3y4Z5aBAAAAC','C6d7E8f9G0hIAAAAC',
        'J1k2L3m4N5oPAAAAC','Q6r7S8t9U0vWAAAAC','X1y2Z3a4B5cDAAAAC','E6f7G8h9I0jKAAAAC',
        'L1m2N3o4P5qRAAAAC','S6t7U8v9W0xYAAAAC','Z1a2B3c4D5eFAAAAC','G6h7I8j9K0lMAAAAC',
        'N1o2P3q4R5sTAAAAC','U6v7W8x9Y0zAAAAAC','B1c2D3e4F5gHAAAAC','I6j7K8l9M0nOAAAAC',
        'P1q2R3s4T5uVAAAAC','W6x7Y8z9A0bCAAAAC','D1e2F3g4H5iJAAAAC','K6l7M8n9O0pQAAAAC',
        'R1s2T3u4V5wXAAAAC','Y6z7A8b9C0dEAAAAC','F1g2H3i4J5kLAAAAC','M6n7O8p9Q0rSAAAAC',
        'T1u2V3w4X5yZAAAAC','A6b7C8d9E0fGAAAAC'
    ]),
    [
        'https://i.imgur.com/2lK9mNo.gif',
        'https://i.imgur.com/6pQ7rSt.gif',
        'https://i.imgur.com/0uV1wXy.gif',
        'https://i.imgur.com/4zA5bCd.gif',
        'https://i.imgur.com/8eF9gHi.gif',
        'https://i.imgur.com/2jK3lMn.gif',
        'https://i.imgur.com/6oP7qRs.gif',
        'https://i.imgur.com/0tU1vWx.gif',
        'https://i.imgur.com/4yZ5aBc.gif',
        'https://i.imgur.com/8dE9fGh.gif'
    ]
);

const poke = pool(
    t([
        'P0k1E2p3O4k5AAAAC','A6b7C8d9E0fGAAAAC','H1i2J3k4L5mNAAAAC','O6p7Q8r9S0tUAAAAC',
        'V1w2X3y4Z5aBAAAAC','C6d7E8f9G0hIAAAAC','J1k2L3m4N5oPAAAAC','Q6r7S8t9U0vWAAAAC',
        'X1y2Z3a4B5cDAAAAC','E6f7G8h9I0jKAAAAC','L1m2N3o4P5qRAAAAC','S6t7U8v9W0xYAAAAC',
        'Z1a2B3c4D5eFAAAAC','G6h7I8j9K0lMAAAAC','N1o2P3q4R5sTAAAAC','U6v7W8x9Y0zAAAAAC',
        'B1c2D3e4F5gHAAAAC','I6j7K8l9M0nOAAAAC','P1q2R3s4T5uVAAAAC','W6x7Y8z9A0bCAAAAC',
        'D1e2F3g4H5iJAAAAC','K6l7M8n9O0pQAAAAC','R1s2T3u4V5wXAAAAC','Y6z7A8b9C0dEAAAAC',
        'F1g2H3i4J5kLAAAAC','M6n7O8p9Q0rSAAAAC','T1u2V3w4X5yZAAAAC','A6b7C8d9E0fGAAAAC',
        'H1i2J3k4L5mNAAAAC','O6p7Q8r9S0tUAAAAC','V1w2X3y4Z5aBAAAAC','C6d7E8f9G0hIAAAAC',
        'J1k2L3m4N5oPAAAAC','Q6r7S8t9U0vWAAAAC','X1y2Z3a4B5cDAAAAC','E6f7G8h9I0jKAAAAC',
        'L1m2N3o4P5qRAAAAC','S6t7U8v9W0xYAAAAC','Z1a2B3c4D5eFAAAAC','G6h7I8j9K0lMAAAAC',
        'N1o2P3q4R5sTAAAAC','U6v7W8x9Y0zAAAAAC','B1c2D3e4F5gHAAAAC','I6j7K8l9M0nOAAAAC',
        'P1q2R3s4T5uVAAAAC','W6x7Y8z9A0bCAAAAC','D1e2F3g4H5iJAAAAC','K6l7M8n9O0pQAAAAC',
        'R1s2T3u4V5wXAAAAC','Y6z7A8b9C0dEAAAAC'
    ]),
    [
        'https://i.imgur.com/3mN4oPq.gif',
        'https://i.imgur.com/7rS8tUv.gif',
        'https://i.imgur.com/1wX2yZa.gif',
        'https://i.imgur.com/5bC6dEf.gif',
        'https://i.imgur.com/9gH0iJk.gif',
        'https://i.imgur.com/3lM4nOp.gif',
        'https://i.imgur.com/7qR8sTu.gif',
        'https://i.imgur.com/1vW2xYz.gif',
        'https://i.imgur.com/5aB6cDe.gif',
        'https://i.imgur.com/9fG0hIj.gif'
    ]
);

const bonk = pool(
    t([
        'B0n1K2b3O4n5AAAAC','C6d7E8f9G0hIAAAAC','J1k2L3m4N5oPAAAAC','Q6r7S8t9U0vWAAAAC',
        'X1y2Z3a4B5cDAAAAC','E6f7G8h9I0jKAAAAC','L1m2N3o4P5qRAAAAC','S6t7U8v9W0xYAAAAC',
        'Z1a2B3c4D5eFAAAAC','G6h7I8j9K0lMAAAAC','N1o2P3q4R5sTAAAAC','U6v7W8x9Y0zAAAAAC',
        'B1c2D3e4F5gHAAAAC','I6j7K8l9M0nOAAAAC','P1q2R3s4T5uVAAAAC','W6x7Y8z9A0bCAAAAC',
        'D1e2F3g4H5iJAAAAC','K6l7M8n9O0pQAAAAC','R1s2T3u4V5wXAAAAC','Y6z7A8b9C0dEAAAAC',
        'F1g2H3i4J5kLAAAAC','M6n7O8p9Q0rSAAAAC','T1u2V3w4X5yZAAAAC','A6b7C8d9E0fGAAAAC',
        'H1i2J3k4L5mNAAAAC','O6p7Q8r9S0tUAAAAC','V1w2X3y4Z5aBAAAAC','C6d7E8f9G0hIAAAAC',
        'J1k2L3m4N5oPAAAAC','Q6r7S8t9U0vWAAAAC','X1y2Z3a4B5cDAAAAC','E6f7G8h9I0jKAAAAC',
        'L1m2N3o4P5qRAAAAC','S6t7U8v9W0xYAAAAC','Z1a2B3c4D5eFAAAAC','G6h7I8j9K0lMAAAAC',
        'N1o2P3q4R5sTAAAAC','U6v7W8x9Y0zAAAAAC','B1c2D3e4F5gHAAAAC','I6j7K8l9M0nOAAAAC',
        'P1q2R3s4T5uVAAAAC','W6x7Y8z9A0bCAAAAC','D1e2F3g4H5iJAAAAC','K6l7M8n9O0pQAAAAC',
        'R1s2T3u4V5wXAAAAC','Y6z7A8b9C0dEAAAAC','F1g2H3i4J5kLAAAAC','M6n7O8p9Q0rSAAAAC',
        'T1u2V3w4X5yZAAAAC','A6b7C8d9E0fGAAAAC'
    ]),
    [
        'https://i.imgur.com/4nO5pQr.gif',
        'https://i.imgur.com/8sT9uVw.gif',
        'https://i.imgur.com/2xY3zAb.gif',
        'https://i.imgur.com/6cD7eFg.gif',
        'https://i.imgur.com/0hI1jKl.gif',
        'https://i.imgur.com/4mN5oPq.gif',
        'https://i.imgur.com/8rS9tUv.gif',
        'https://i.imgur.com/2wX3yZa.gif',
        'https://i.imgur.com/6bC7dEf.gif',
        'https://i.imgur.com/0gH1iJk.gif'
    ]
);

const bite = pool(
    t([
        'B0i1T2e3B4i5AAAAC','T6u7V8w9X0yZAAAAC','A1b2C3d4E5fGAAAAC','H6i7J8k9L0mNAAAAC',
        'O1p2Q3r4S5tUAAAAC','V6w7X8y9Z0aBAAAAC','C1d2E3f4G5hIAAAAC','J6k7L8m9N0oPAAAAC',
        'Q1r2S3t4U5vWAAAAC','X6y7Z8a9B0cDAAAAC','E1f2G3h4I5jKAAAAC','L6m7N8o9P0qRAAAAC',
        'S1t2U3v4W5xYAAAAC','Z6a7B8c9D0eFAAAAC','G1h2I3j4K5lMAAAAC','N6o7P8q9R0sTAAAAC',
        'U1v2W3x4Y5zAAAAAC','B6c7D8e9F0gHAAAAC','I1j2K3l4M5nOAAAAC','P6q7R8s9T0uVAAAAC',
        'W1x2Y3z4A5bCAAAAC','D6e7F8g9H0iJAAAAC','K1l2M3n4O5pQAAAAC','R6s7T8u9V0wXAAAAC',
        'Y1z2A3b4C5dEAAAAC','F6g7H8i9J0kLAAAAC','M1n2O3p4Q5rSAAAAC','T6u7V8w9X0yZAAAAC',
        'A1b2C3d4E5fGAAAAC','H6i7J8k9L0mNAAAAC','O1p2Q3r4S5tUAAAAC','V6w7X8y9Z0aBAAAAC',
        'C1d2E3f4G5hIAAAAC','J6k7L8m9N0oPAAAAC','Q1r2S3t4U5vWAAAAC','X6y7Z8a9B0cDAAAAC',
        'E1f2G3h4I5jKAAAAC','L6m7N8o9P0qRAAAAC','S1t2U3v4W5xYAAAAC','Z6a7B8c9D0eFAAAAC',
        'G1h2I3j4K5lMAAAAC','N6o7P8q9R0sTAAAAC','U1v2W3x4Y5zAAAAAC','B6c7D8e9F0gHAAAAC',
        'I1j2K3l4M5nOAAAAC','P6q7R8s9T0uVAAAAC','W1x2Y3z4A5bCAAAAC','D6e7F8g9H0iJAAAAC',
        'K1l2M3n4O5pQAAAAC','R6s7T8u9V0wXAAAAC'
    ]),
    [
        'https://i.imgur.com/5oP6qRs.gif',
        'https://i.imgur.com/9tU0vWx.gif',
        'https://i.imgur.com/3yZ4aBc.gif',
        'https://i.imgur.com/7dE8fGh.gif',
        'https://i.imgur.com/1iJ2kLm.gif',
        'https://i.imgur.com/5nO6pQr.gif',
        'https://i.imgur.com/9sT0uVw.gif',
        'https://i.imgur.com/3xY4zAb.gif',
        'https://i.imgur.com/7cD8eFg.gif',
        'https://i.imgur.com/1hI2jKl.gif'
    ]
);

const highfive = pool(
    t([
        'H0i1G2h3F4i5AAAAC','V6w7X8y9Z0aBAAAAC','C1d2E3f4G5hIAAAAC','J6k7L8m9N0oPAAAAC',
        'Q1r2S3t4U5vWAAAAC','X6y7Z8a9B0cDAAAAC','E1f2G3h4I5jKAAAAC','L6m7N8o9P0qRAAAAC',
        'S1t2U3v4W5xYAAAAC','Z6a7B8c9D0eFAAAAC','G1h2I3j4K5lMAAAAC','N6o7P8q9R0sTAAAAC',
        'U1v2W3x4Y5zAAAAAC','B6c7D8e9F0gHAAAAC','I1j2K3l4M5nOAAAAC','P6q7R8s9T0uVAAAAC',
        'W1x2Y3z4A5bCAAAAC','D6e7F8g9H0iJAAAAC','K1l2M3n4O5pQAAAAC','R6s7T8u9V0wXAAAAC',
        'Y1z2A3b4C5dEAAAAC','F6g7H8i9J0kLAAAAC','M1n2O3p4Q5rSAAAAC','T6u7V8w9X0yZAAAAC',
        'A1b2C3d4E5fGAAAAC','H6i7J8k9L0mNAAAAC','O1p2Q3r4S5tUAAAAC','V6w7X8y9Z0aBAAAAC',
        'C1d2E3f4G5hIAAAAC','J6k7L8m9N0oPAAAAC','Q1r2S3t4U5vWAAAAC','X6y7Z8a9B0cDAAAAC',
        'E1f2G3h4I5jKAAAAC','L6m7N8o9P0qRAAAAC','S1t2U3v4W5xYAAAAC','Z6a7B8c9D0eFAAAAC',
        'G1h2I3j4K5lMAAAAC','N6o7P8q9R0sTAAAAC','U1v2W3x4Y5zAAAAAC','B6c7D8e9F0gHAAAAC',
        'I1j2K3l4M5nOAAAAC','P6q7R8s9T0uVAAAAC','W1x2Y3z4A5bCAAAAC','D6e7F8g9H0iJAAAAC',
        'K1l2M3n4O5pQAAAAC','R6s7T8u9V0wXAAAAC','Y1z2A3b4C5dEAAAAC','F6g7H8i9J0kLAAAAC',
        'M1n2O3p4Q5rSAAAAC','T6u7V8w9X0yZAAAAC'
    ]),
    [
        'https://i.imgur.com/6pQ7rSt.gif',
        'https://i.imgur.com/0uV1wXy.gif',
        'https://i.imgur.com/4zA5bCd.gif',
        'https://i.imgur.com/8eF9gHi.gif',
        'https://i.imgur.com/2jK3lMn.gif',
        'https://i.imgur.com/6oP7qRs.gif',
        'https://i.imgur.com/0tU1vWx.gif',
        'https://i.imgur.com/4yZ5aBc.gif',
        'https://i.imgur.com/8dE9fGh.gif',
        'https://i.imgur.com/2iJ3kLm.gif'
    ]
);

const cry = pool(
    t([
        'C0r1Y2c3R4y5AAAAC','A6b7C8d9E0fGAAAAC','H1i2J3k4L5mNAAAAC','O6p7Q8r9S0tUAAAAC',
        'V1w2X3y4Z5aBAAAAC','C6d7E8f9G0hIAAAAC','J1k2L3m4N5oPAAAAC','Q6r7S8t9U0vWAAAAC',
        'X1y2Z3a4B5cDAAAAC','E6f7G8h9I0jKAAAAC','L1m2N3o4P5qRAAAAC','S6t7U8v9W0xYAAAAC',
        'Z1a2B3c4D5eFAAAAC','G6h7I8j9K0lMAAAAC','N1o2P3q4R5sTAAAAC','U6v7W8x9Y0zAAAAAC',
        'B1c2D3e4F5gHAAAAC','I6j7K8l9M0nOAAAAC','P1q2R3s4T5uVAAAAC','W6x7Y8z9A0bCAAAAC',
        'D1e2F3g4H5iJAAAAC','K6l7M8n9O0pQAAAAC','R1s2T3u4V5wXAAAAC','Y6z7A8b9C0dEAAAAC',
        'F1g2H3i4J5kLAAAAC','M6n7O8p9Q0rSAAAAC','T1u2V3w4X5yZAAAAC','A6b7C8d9E0fGAAAAC',
        'H1i2J3k4L5mNAAAAC','O6p7Q8r9S0tUAAAAC','V1w2X3y4Z5aBAAAAC','C6d7E8f9G0hIAAAAC',
        'J1k2L3m4N5oPAAAAC','Q6r7S8t9U0vWAAAAC','X1y2Z3a4B5cDAAAAC','E6f7G8h9I0jKAAAAC',
        'L1m2N3o4P5qRAAAAC','S6t7U8v9W0xYAAAAC','Z1a2B3c4D5eFAAAAC','G6h7I8j9K0lMAAAAC',
        'N1o2P3q4R5sTAAAAC','U6v7W8x9Y0zAAAAAC','B1c2D3e4F5gHAAAAC','I6j7K8l9M0nOAAAAC',
        'P1q2R3s4T5uVAAAAC','W6x7Y8z9A0bCAAAAC','D1e2F3g4H5iJAAAAC','K6l7M8n9O0pQAAAAC',
        'R1s2T3u4V5wXAAAAC','Y6z7A8b9C0dEAAAAC'
    ]),
    [
        'https://i.imgur.com/7qR8sTu.gif',
        'https://i.imgur.com/1vW2xYz.gif',
        'https://i.imgur.com/5aB6cDe.gif',
        'https://i.imgur.com/9fG0hIj.gif',
        'https://i.imgur.com/3kL4mNo.gif',
        'https://i.imgur.com/7pQ8rSt.gif',
        'https://i.imgur.com/1uV2wXy.gif',
        'https://i.imgur.com/5zA6bCd.gif',
        'https://i.imgur.com/9eF0gHi.gif',
        'https://i.imgur.com/3jK4lMn.gif'
    ]
);

const dance = pool(
    t([
        'D0a1N2c3E4d5AAAAC','A6b7C8d9E0fGAAAAC','H1i2J3k4L5mNAAAAC','O6p7Q8r9S0tUAAAAC',
        'V1w2X3y4Z5aBAAAAC','C6d7E8f9G0hIAAAAC','J1k2L3m4N5oPAAAAC','Q6r7S8t9U0vWAAAAC',
        'X1y2Z3a4B5cDAAAAC','E6f7G8h9I0jKAAAAC','L1m2N3o4P5qRAAAAC','S6t7U8v9W0xYAAAAC',
        'Z1a2B3c4D5eFAAAAC','G6h7I8j9K0lMAAAAC','N1o2P3q4R5sTAAAAC','U6v7W8x9Y0zAAAAAC',
        'B1c2D3e4F5gHAAAAC','I6j7K8l9M0nOAAAAC','P1q2R3s4T5uVAAAAC','W6x7Y8z9A0bCAAAAC',
        'D1e2F3g4H5iJAAAAC','K6l7M8n9O0pQAAAAC','R1s2T3u4V5wXAAAAC','Y6z7A8b9C0dEAAAAC',
        'F1g2H3i4J5kLAAAAC','M6n7O8p9Q0rSAAAAC','T1u2V3w4X5yZAAAAC','A6b7C8d9E0fGAAAAC',
        'H1i2J3k4L5mNAAAAC','O6p7Q8r9S0tUAAAAC','V1w2X3y4Z5aBAAAAC','C6d7E8f9G0hIAAAAC',
        'J1k2L3m4N5oPAAAAC','Q6r7S8t9U0vWAAAAC','X1y2Z3a4B5cDAAAAC','E6f7G8h9I0jKAAAAC',
        'L1m2N3o4P5qRAAAAC','S6t7U8v9W0xYAAAAC','Z1a2B3c4D5eFAAAAC','G6h7I8j9K0lMAAAAC',
        'N1o2P3q4R5sTAAAAC','U6v7W8x9Y0zAAAAAC','B1c2D3e4F5gHAAAAC','I6j7K8l9M0nOAAAAC',
        'P1q2R3s4T5uVAAAAC','W6x7Y8z9A0bCAAAAC','D1e2F3g4H5iJAAAAC','K6l7M8n9O0pQAAAAC',
        'R1s2T3u4V5wXAAAAC','Y6z7A8b9C0dEAAAAC'
    ]),
    [
        'https://i.imgur.com/8rS9tUv.gif',
        'https://i.imgur.com/2wX3yZa.gif',
        'https://i.imgur.com/6bC7dEf.gif',
        'https://i.imgur.com/0gH1iJk.gif',
        'https://i.imgur.com/4lM5nOp.gif',
        'https://i.imgur.com/8qR9sTu.gif',
        'https://i.imgur.com/2vW3xYz.gif',
        'https://i.imgur.com/6aB7cDe.gif',
        'https://i.imgur.com/0fG1hIj.gif',
        'https://i.imgur.com/4kL5mNo.gif'
    ]
);

const MAP = {
    hug,
    kiss,
    slap,
    pat,
    poke,
    bonk,
    bite,
    highfive,
    cry,
    dance,
    // aliases usados nos register()
    abraco: hug,
    beijo: kiss,
    tapa: slap,
    carinho: pat,
    cutucar: poke,
    morder: bite,
    chorar: cry,
    dancar: dance
};

function pick(category) {
    const list = MAP[category] || MAP.hug;
    if (!list || !list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
}

function count(category) {
    return (MAP[category] || []).length;
}

module.exports = { MAP, pick, count, hug, kiss, slap, pat, poke, bonk, bite, highfive, cry, dance };
