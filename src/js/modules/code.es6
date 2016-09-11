const movies = [
    {
        title: 'Star Wars: Episode III - Revenge of the Sith',
        year: 2005,
        director: 'George Lucas',
        genre: 'Adventure, Sci-Fi',
    },
    {
        title: 'Interstellar',
        year: 2014,
        director: 'Christopher Nolan',
        genre: 'Adventure, Drama, Sci-Fi',
    },
    {
        title: 'Juno',
        year: 2007,
        director: 'Jason Reitman',
        genre: 'Comedy, Drama, Romance',
    },
];

export const pretty = movies.map(movie => {
    const { title, year, director } = movie;

    return `${title} (${year}), ${director}`;
});

export default (a, b, operation) => operation(a, b);
export const sum = (a, b) => a + b;
export const diff = (a, b) => a - b;
export const mul = (a, b) => a * b;
export const div = (a, b) => a / b;
