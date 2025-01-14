const aiModule = {
    // Funkcja decydująca, ile czasu spędzić na stronie (w milisekundach)
    decideTimeOnPage: () => {
        const minTime = 1000; // Minimalny czas w milisekundach
        const maxTime = 5000; // Maksymalny czas w milisekundach
        return Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
    },

    // Funkcja decydująca o następnej akcji
    decideNextActionOne: () => {
        const actions = ['explore_popular_post', 'explore_recommended_post', 'explore_label_link', 'explore_sitemain_post',
						 'explore_external_site','explore_newest_post','explore_page'
						];
        return actions[Math.floor(Math.random() * actions.length)];
    }
};

module.exports = aiModule;

