
CREATE TABLE IF NOT EXISTS `playlist` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(45) NOT NULL,
  `created_by` varchar(45) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `song` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(45) NOT NULL,
  `artist` varchar(45) NOT NULL,
  `url` varchar(400) NOT NULL,
  `added_by` varchar(45) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `song_in_playlist` (
  `timestamp` int(11) NOT NULL,
  `id_song` int(11) NOT NULL,
  `id_playlist` int(11) NOT NULL,
  KEY `fk_id_song_idx` (`id_song`),
  KEY `fk_id_playlist_idx` (`id_playlist`),
  CONSTRAINT `fk_id_playlist` FOREIGN KEY (`id_playlist`) REFERENCES `playlist` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `fk_id_song` FOREIGN KEY (`id_song`) REFERENCES `song` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

