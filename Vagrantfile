# -*- mode: ruby -*-
# vi: set ft=ruby :

# All Vagrant configuration is done below. The "2" in Vagrant.configure
# configures the configuration version (we support older styles for
# backwards compatibility). Please don't change it unless you know what
# you're doing.
Vagrant.configure(2) do |config|
  # The most common configuration options are documented and commented below.
  # For a complete reference, please see the online documentation at
  # https://docs.vagrantup.com.

  # Every Vagrant development environment requires a box. You can search for
  # boxes at https://atlas.hashicorp.com/search.
  config.vm.box = "jhcook/fedora24"

  # Disable automatic box update checking. If you disable this, then
  # boxes will only be checked for updates when the user runs
  # `vagrant box outdated`. This is not recommended.
  # config.vm.box_check_update = false

  config.vm.define "development", primary:true do |development|
	development.vm.provider "virtualbox" do |vb|
	  vb.name = "openessence_development"
      vb.customize ['modifyvm', :id, '--cableconnected1', 'on']
      vb.memory = "4096"
    end

	  development.vm.network "forwarded_port", guest: 9000, host: 9000
    development.vm.network "forwarded_port", guest: 9200, host: 9200
    development.vm.network "forwarded_port", guest: 9300, host: 9300
    development.vm.network "forwarded_port", guest: 8080, host: 8080

  	config.vm.provision :shell, privileged:false, path: "vagrant/scripts/development/1_setup.sh"
  	config.vm.provision :shell, privileged:false, path: "vagrant/scripts/development/2_install.sh"
	  config.vm.provision :shell, privileged:false, path: "vagrant/scripts/development/3_setup_containers.sh"

  end

end