<?php

namespace AppBundle\EventListener\Upload;

use AppBundle\Entity\Restaurant;
use Doctrine\Common\Persistence\ManagerRegistry;
use Oneup\UploaderBundle\Event\PostPersistEvent;
use Psr\Log\LoggerInterface;
use Vich\UploaderBundle\Handler\UploadHandler;
use Vich\UploaderBundle\Mapping\PropertyMappingFactory;

final class RestaurantListener
{
    private $doctrine;
    private $logger;

    public function __construct(
        ManagerRegistry $doctrine,
        PropertyMappingFactory $mappingFactory,
        UploadHandler $uploadHandler,
        LoggerInterface $logger)
    {
        $this->doctrine = $doctrine;
        $this->mappingFactory = $mappingFactory;
        $this->uploadHandler = $uploadHandler;
        $this->logger = $logger;
    }

    public function onUpload(PostPersistEvent $event)
    {
        $request = $event->getRequest();
        $response = $event->getResponse();
        $file = $event->getFile();
        $config = $event->getConfig();

        $restaurantId = $request->get('restaurant');

        $restaurant = $this->doctrine->getRepository(Restaurant::class)->find($restaurantId);

        // Remove previous file
        $this->uploadHandler->remove($restaurant, 'imageFile');

        $restaurant->setImageName($file->getFilename());
        $this->doctrine->getManagerForClass(Restaurant::class)->flush();

        $propertyMapping = $this->mappingFactory->fromField($restaurant, 'imageFile');
        $directoryNamer = $propertyMapping->getDirectoryNamer();

        $target = sprintf('%s/%s',
            $config['storage']['directory'],
            $directoryNamer->directoryName($restaurant, $propertyMapping)
        );

        $file->move($target);

        // if everything went fine
        $response = $event->getResponse();
        $response['success'] = true;

        return $response;
    }
}
