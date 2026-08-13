-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Aug 05, 2026 at 09:29 AM
-- Server version: 8.4.3
-- PHP Version: 8.3.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `sm_sport_center`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin`
--

CREATE TABLE `admin` (
  `id` int NOT NULL,
  `nama` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `admin`
--

INSERT INTO `admin` (`id`, `nama`, `email`, `password`, `created_at`) VALUES
(1, 'Administrator Utama', 'admin@smsport.com', '$2y$10$zN3zUe180MQpFNBZ.QuqxO8yiYfkzFnu1NDOaFT0r458u9R/Vjzw2', '2026-07-30 02:42:34'),
(2, 'admin2', 'admin2@smsport', 'admin123', '2026-07-30 02:54:19');

-- --------------------------------------------------------

--
-- Table structure for table `lapangan`
--

CREATE TABLE `lapangan` (
  `id` int NOT NULL,
  `nama_lapangan` varchar(50) NOT NULL,
  `jenis_olahraga` enum('futsal','badminton') NOT NULL,
  `harga_per_jam` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `lapangan`
--

INSERT INTO `lapangan` (`id`, `nama_lapangan`, `jenis_olahraga`, `harga_per_jam`, `created_at`) VALUES
(1, 'Futsal Field A', 'futsal', 120000, '2026-07-27 09:59:14'),
(2, 'Futsal Field B', 'futsal', 120000, '2026-07-27 09:59:14'),
(3, 'Badminton Court 1', 'badminton', 50000, '2026-07-27 09:59:14'),
(4, 'Badminton Court 2', 'badminton', 50000, '2026-07-27 09:59:14'),
(5, 'Badminton Court 3', 'badminton', 50000, '2026-07-27 09:59:14');

-- --------------------------------------------------------

--
-- Table structure for table `reservasi`
--

CREATE TABLE `reservasi` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `lapangan_id` int NOT NULL,
  `tanggal` date NOT NULL,
  `jam_mulai` time NOT NULL,
  `jam_selesai` time NOT NULL,
  `total_harga` int NOT NULL,
  `status` enum('pending','disetujui','dibatalkan') DEFAULT 'disetujui',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `reservasi`
--

INSERT INTO `reservasi` (`id`, `user_id`, `lapangan_id`, `tanggal`, `jam_mulai`, `jam_selesai`, `total_harga`, `status`, `created_at`) VALUES
(6, 4, 5, '2026-07-27', '22:02:00', '23:02:00', 50000, 'disetujui', '2026-07-27 15:02:21'),
(8, 4, 1, '2026-07-30', '10:43:00', '11:43:00', 120000, 'disetujui', '2026-07-30 01:43:36'),
(9, 4, 3, '2026-07-30', '13:45:00', '14:45:00', 50000, 'disetujui', '2026-07-30 01:45:43'),
(10, 4, 4, '2026-07-30', '10:46:00', '12:50:00', 103334, 'disetujui', '2026-07-30 01:46:29'),
(11, 4, 4, '2026-07-30', '13:46:00', '14:46:00', 50000, 'disetujui', '2026-07-30 01:46:41'),
(12, 6, 3, '2026-07-30', '10:31:00', '11:31:00', 50000, 'disetujui', '2026-07-30 03:31:16'),
(13, 6, 1, '2026-07-30', '12:32:00', '14:32:00', 240000, 'disetujui', '2026-07-30 03:32:25'),
(14, 7, 1, '2026-07-31', '14:48:00', '15:49:00', 122000, 'disetujui', '2026-07-30 03:48:53'),
(15, 9, 1, '2026-08-05', '10:00:00', '11:00:00', 120000, 'disetujui', '2026-08-05 08:40:11'),
(16, 9, 1, '2026-08-05', '14:00:00', '16:00:00', 240000, 'disetujui', '2026-08-05 08:52:19'),
(17, 9, 3, '2026-08-05', '10:00:00', '11:00:00', 50000, 'disetujui', '2026-08-05 08:59:39');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `nama` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','pelanggan') DEFAULT 'pelanggan',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `nama`, `email`, `password`, `role`, `created_at`) VALUES
(1, 'Administrator', 'admin@smsport.com', 'admin123', 'admin', '2026-07-27 09:59:14'),
(2, 'Budi Santoso', 'budi@gmail.com', '$2y$10$e0MYzXyjpJS7Pd0RVvHwHe1b./wV91/Oal/a4w.70425Q82m29m3K', 'pelanggan', '2026-07-27 09:59:14'),
(4, 'RIZAL WIDIANTO NUGROHO', 'rizalwidianto232@gmail.com', '$2y$10$zN3zUe180MQpFNBZ.QuqxO8yiYfkzFnu1NDOaFT0r458u9R/Vjzw2', 'pelanggan', '2026-07-27 15:01:53'),
(5, 'admin3', 'admin3@sportsm.com', 'admin123', 'admin', '2026-07-30 03:05:56'),
(6, 'kharis kurniawan', 'kharis@gmail.com', '$2y$10$G6ln/sQASS3K5utw8fwQL.umvPEwnzdxAJHc5HtnOR9sknNqCmsNe', 'pelanggan', '2026-07-30 03:29:26'),
(7, 'admin12', 'admin12@smsport.com', '$2y$10$IvwIWywIS86fNlptz5SmJOcQgP5PXZrvilv.q8O3RyEGmS1XoKnzq', 'pelanggan', '2026-07-30 03:34:35'),
(8, 'Super Admin', 'adminbaru@smsport.com', '$2y$10$e0MYzXyjpJS7Pd0RVvHwHe1b./wV91/Oal/a4w.70425Q82m29m3K', 'admin', '2026-08-03 04:55:49'),
(9, 'ijal', 'ijal@gmail.com', '$2y$10$red9F0L57DwVnzrwjNC86.hoEFJhWjlJlKAwPlKE7B589H1Y0JYXu', 'pelanggan', '2026-08-05 08:39:47'),
(10, 'Administrator', 'admin@gmail.com', '$2y$10$r19PQGMo4nOQK40IF2FyMOzS2Qt7323mtKTV7cxJLuuMkFyXY7I0i', 'admin', '2026-08-05 09:24:34');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin`
--
ALTER TABLE `admin`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `lapangan`
--
ALTER TABLE `lapangan`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `reservasi`
--
ALTER TABLE `reservasi`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_jadwal` (`lapangan_id`,`tanggal`,`jam_mulai`,`jam_selesai`,`status`),
  ADD KEY `idx_validasi_jadwal` (`lapangan_id`,`tanggal`,`jam_mulai`,`jam_selesai`,`status`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin`
--
ALTER TABLE `admin`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `lapangan`
--
ALTER TABLE `lapangan`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `reservasi`
--
ALTER TABLE `reservasi`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `reservasi`
--
ALTER TABLE `reservasi`
  ADD CONSTRAINT `reservasi_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reservasi_ibfk_2` FOREIGN KEY (`lapangan_id`) REFERENCES `lapangan` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
